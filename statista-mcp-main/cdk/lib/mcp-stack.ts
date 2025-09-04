import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr_assets from "aws-cdk-lib/aws-ecr-assets";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as elbv2_targets from "aws-cdk-lib/aws-elasticloadbalancingv2-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as path from "path";
import * as route53 from "aws-cdk-lib/aws-route53";

import {
  DatadogECSFargateTaskDefinition,
  LoggingType,
} from "datadog-cdk-constructs-v2";

import { Construct } from "constructs";
import { lookupVpc, VpcLookupProps } from "./vpc";
import { ApiAccess, ApiCredentials, lookupDataDogKeySecret } from "./secrets";

export interface MCPClusterProps {
  readonly numberOfTasks: number;
  readonly memoryLimitMiB: number;
  readonly cpu: number;
}

interface MCPStackProps extends cdk.StackProps {
  readonly envName: string;
  readonly regionShort: string;
  readonly vpc: VpcLookupProps;
  readonly ecrRepositoryName: string;
  readonly searchEndpointURL: string;
  readonly dataEndpointURL: string;
  readonly cluster: MCPClusterProps;
  readonly hostedZoneAttributes: route53.HostedZoneAttributes;
  readonly mcpServerApiCredentials: ApiCredentials;
  readonly mcpServerApiAccess: ApiAccess[];
}

export class MCPStack extends cdk.Stack {
  private static CONTAINER_PORT: number = 3000;

  constructor(scope: Construct, id: string, props: MCPStackProps) {
    super(scope, id, props);

    const taskDefinition = MCPStack.createTask(this, props);

    const service = MCPStack.createService(this, taskDefinition, props);

    MCPStack.setupLBwithAuth(service, props.mcpServerApiCredentials);
  }

  private static createTask(
    scope: cdk.Stack,
    props: MCPStackProps,
  ): ecs.FargateTaskDefinition {
    const datadogApiKeySecret = lookupDataDogKeySecret(scope, props.envName);

    const taskDefinition = new DatadogECSFargateTaskDefinition(
      scope,
      "FargateTask",
      // Fargate Task Definition Props
      {
        memoryLimitMiB: props.cluster.memoryLimitMiB,
        cpu: props.cluster.cpu,
        runtimePlatform: {
          cpuArchitecture: ecs.CpuArchitecture.ARM64,
          operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
        },
      },
      // Datadog ECS Fargate Props
      {
        apiKeySecret: datadogApiKeySecret,
        env: props.envName,
        service: "mcp-server",
        site: "datadoghq.eu",
        environmentVariables: {
          DD_TAGS: `team:opp,env:${props.envName}`,
          DD_LOGS_ENABLED: "true",
          DD_PROCESS_AGENT_ENABLED: "true",
          DD_PROCESS_AGENT_PROCESS_COLLECTION_ENABLED: "true",
          // uncomment for OpenTelemetry integration
          //DD_OTLP_CONFIG_RECEIVER_PROTOCOLS_GRPC_ENDPOINT: "0.0.0.0:4317",
          //DD_OTLP_CONFIG_RECEIVER_PROTOCOLS_HTTP_ENDPOINT: "0.0.0.0:4318",
          //DD_OTLP_CONFIG_LOGS_ENABLED: "false",
        },
        dogstatsd: {
          isEnabled: true,
        },
        apm: {
          isEnabled: false,
        },
        logCollection: {
          isEnabled: true,
          loggingType: LoggingType.FLUENTBIT,
          fluentbitConfig: {
            firelensOptions: {
              isParseJson: true,
            },
            isLogRouterDependencyEnabled: true,
            logDriverConfig: {
              tls: "on",
              serviceName: "mcp-server",
              sourceName: "nodejs",
              hostEndpoint: "http-intake.logs.datadoghq.eu",
              messageKey: "message",
            },
          },
        },
      },
    );

    MCPStack.addBackendContainer(scope, taskDefinition, props);

    return taskDefinition;
  }

  private static addBackendContainer(
    scope: cdk.Stack,
    taskDefinition: DatadogECSFargateTaskDefinition,
    props: MCPStackProps,
  ) {
    const dockerImage = MCPStack.createDockerImage(scope);
    taskDefinition.addContainer("MCPServer", {
      image: ecs.ContainerImage.fromDockerImageAsset(dockerImage),
      essential: true,
      environment: {
        LOG_LEVEL: "info",
        SEARCH_ENDPOINT_URL: props.searchEndpointURL,
        DATA_ENDPOINT_URL: props.dataEndpointURL,
        ECS_FARGATE: "true",
        DD_ENABLED: "true",
        DD_LOGS_ENABLED: "true",
        //OTEL_EXPORTER_OTLP_ENDPOINT: "http://datadog-agent:4318",
      },
      healthCheck: {
        command: [
          "CMD-SHELL",
          `curl -f http://localhost:${MCPStack.CONTAINER_PORT}/health || exit 1`,
        ],
      },
      portMappings: [
        {
          containerPort: MCPStack.CONTAINER_PORT,
        },
      ],
    });
  }
  private static createService(
    scope: cdk.Stack,
    taskDefinition: ecs.FargateTaskDefinition,
    props: MCPStackProps,
  ): ecsPatterns.ApplicationLoadBalancedFargateService {
    const vpc = lookupVpc(scope, props.vpc);

    const cluster = new ecs.Cluster(scope, "FargateCluster", {
      vpc,
      clusterName: "mcp",
    });

    const domainZone = route53.PublicHostedZone.fromHostedZoneAttributes(
      scope,
      "IngestionAPIDomainZone",
      props.hostedZoneAttributes,
    );

    const service = new ecsPatterns.ApplicationLoadBalancedFargateService(
      scope,
      "FargateService",
      {
        cluster,
        serviceName: "mcp",
        domainName: `${props.regionShort}.${domainZone.zoneName}`,
        domainZone: domainZone,
        protocol: elbv2.ApplicationProtocol.HTTPS,
        taskDefinition,
        taskSubnets: { subnets: cluster.vpc.privateSubnets },
        publicLoadBalancer: false,
        desiredCount: props.cluster.numberOfTasks,
        circuitBreaker: {
          enable: true,
          rollback: true,
        },

        minHealthyPercent: 50,
        maxHealthyPercent: 200,
        healthCheckGracePeriod: cdk.Duration.seconds(30),
      },
    );

    // once more than one task is needed, the LB needs to route to the same instance
    // as the protocol is "kind of" stateful
    if (props.cluster.numberOfTasks > 1) {
      service.targetGroup.enableCookieStickiness(
        cdk.Duration.hours(1),
        "mcp-session-id",
      );
    }

    service.targetGroup.configureHealthCheck({
      path: "/health",
      healthyThresholdCount: 2,
      timeout: cdk.Duration.seconds(5),
    });

    /*service.loadBalancer.connections.allowFrom(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(443),
    );*/
    service.service.connections.allowFrom(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(443),
    );
    service.service.connections.allowToAnyIpv4(ec2.Port.tcp(443));

    // Create NLB that forwards to ALB
    const nlb = new elbv2.NetworkLoadBalancer(scope, "ServiceNLB", {
      vpc,
      internetFacing: false,
    });

    // Create target group pointing to ALB
    const nlbTargetGroup = new elbv2.NetworkTargetGroup(
      scope,
      "NLBTargetGroup",
      {
        vpc,
        port: 443,
        targets: [
          new elbv2_targets.AlbArnTarget(
            service.loadBalancer.loadBalancerArn,
            443,
          ),
        ], // Point NLB to ALB
      },
    );

    nlb.addListener("NLBListener", {
      port: 443,
      defaultTargetGroups: [nlbTargetGroup],
    });

    const allowedPrincipals = props.mcpServerApiAccess
      .filter((a) => a.account || false)
      .map((a) => new iam.AccountPrincipal(a.account));
    const endpointService = new ec2.VpcEndpointService(
      scope,
      "MCPEndpointService",
      {
        vpcEndpointServiceLoadBalancers: [nlb],
        supportedIpAddressTypes: [ec2.IpAddressType.IPV4],
        acceptanceRequired: false,
        allowedPrincipals,
      },
    );

    // Output the cross-account role ARN
    new cdk.CfnOutput(scope, "MCPEndpointServiceOut", {
      value: endpointService.vpcEndpointServiceName,
    });
    return service;
  }

  private static createDockerImage(
    scope: Construct,
  ): ecr_assets.DockerImageAsset {
    const id = "MCPServerDockerImage";
    const dockerImage = new ecr_assets.DockerImageAsset(scope, id, {
      directory: path.join(__dirname, "../../"),

      platform: ecr_assets.Platform.LINUX_ARM64,
      buildArgs: {
        provenance: "false",
        sbom: "false",
      },
      ignoreMode: cdk.IgnoreMode.DOCKER,
      extraHash: cdk.Stack.of(scope).region,
      exclude: ["cdk/**", "scripts/**"],
      ...(isCi()
        ? {
            cacheTo: {
              type: "gha",
              params: { mode: "max", scope: id },
            },
            cacheFrom: [
              {
                type: "gha",
                params: {
                  scope: id,
                },
              },
            ],
            outputs: ["type=docker"],
          }
        : {}),
    });

    return dockerImage;
  }

  private static setupLBwithAuth(
    service: ecsPatterns.ApplicationLoadBalancedFargateService,
    credentials: ApiCredentials,
  ): void {
    const secretValue = cdk.Fn.join("", [
      "{{resolve:secretsmanager:",
      credentials.secretArn,
      ":SecretString:headerFieldValue}}",
    ]);

    service.listener.addAction("HeaderAuthRule", {
      priority: 1,
      action: elbv2.ListenerAction.forward([service.targetGroup]),
      conditions: [
        elbv2.ListenerCondition.httpHeader(credentials.apiKeyHeaderName, [
          secretValue,
        ]),
      ],
    });

    service.listener.addAction("RejectAllNonAuth", {
      action: elbv2.ListenerAction.fixedResponse(403, {
        contentType: "text/plain",
        messageBody: "Forbidden: Missing or incorrect authentication header",
      }),
    });

    service.loadBalancer.addListener("HttpRedirectListener", {
      port: 80,
      open: true,
      defaultAction: elbv2.ListenerAction.redirect({
        port: "443",
        protocol: elbv2.ApplicationProtocol.HTTPS,
        permanent: true,
      }),
    });
  }
}

function isCi(): boolean {
  // CI=true is set by GitHub Actions, CircleCI, etc.
  return process.env.CI !== undefined;
}
