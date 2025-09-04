import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as elbv2_targets from "aws-cdk-lib/aws-elasticloadbalancingv2-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export interface MCPProps {
  readonly uri: string;
  readonly mcpServiceAccessSecretArn: string;
  readonly apiAccessSecretArn: string;
  readonly vpcEndpointName: string;
  readonly vpcEndpointIPAdresses: string[];
}

export interface VpcLookupProps {
  readonly privateSubnetIds: string[];
  readonly privateSubnetRouteTableIds: string[];
  readonly availabilityZones: string[];
  readonly vpcCidrBlock: string;
}

interface ApiGatewayProps extends cdk.StackProps {
  readonly envName: string;
  readonly regionShort: string;
  readonly region: string;
  readonly vpcId: string;
  readonly vpcLookup: VpcLookupProps | undefined;
  readonly restApiId: string;
  readonly resourceId: string;
  readonly mcp: MCPProps;
}

// TEMPORARY: this will be moved to the global-search repository
export class ApiGatewayStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiGatewayProps) {
    super(scope, id, props);

    const restApi = apigateway.RestApi.fromRestApiAttributes(
      this,
      "RestApiExtension",
      {
        restApiId: props.restApiId,
        rootResourceId: props.resourceId,
      },
    );

    // API gateway v1 (RestAPI) CDK code does not provide a way to lookup authorizer for reuse,
    // so a new one is created, based on the existing lambda.
    const authorizeLambda = lambda.Function.fromFunctionName(
      this,
      "AuthorizerLambdaImport",
      "global-search-api-auth",
    );

    const authorizer = new apigateway.RequestAuthorizer(
      this,
      "AuthorizerImported",
      {
        handler: authorizeLambda,
        identitySources: [],
        resultsCacheTtl: cdk.Duration.seconds(0),
      },
    );

    const baseResource = apigateway.Resource.fromResourceAttributes(
      this,
      "BaseResourceImport",
      {
        path: "/v1",
        resourceId: props.resourceId,
        restApi,
      },
    );

    if (!baseResource) {
      throw new Error("RestAPI base resource '/v1' is missing");
    }

    const requestParameters = {
      "method.request.header.x-api-key": false,
      "method.request.header.X-MCP-API-Key": false,
    };

    const secret = secretsmanager.Secret.fromSecretCompleteArn(
      this,
      "MCPAccessSecret",
      props.mcp.apiAccessSecretArn,
    );

    const apiKeyHeader = secret
      .secretValueFromJson("headerFieldName")
      .unsafeUnwrap();
    const apiKeyValue = secret
      .secretValueFromJson("headerFieldValue")
      .unsafeUnwrap();
    const requestParameterMapping = {
      "integration.request.header.x-api-key": "method.request.header.x-api-key",
      [`integration.request.header.${apiKeyHeader}`]: `'${apiKeyValue}'`,
    };

    const vpcLink = ApiGatewayStack.createVpcLink(this, props);

    const mcpResource = baseResource.addResource("mcp");

    for (const httpMethod of ["GET", "POST", "DELETE", "OPTIONS"]) {
      mcpResource.addMethod(
        httpMethod,
        new apigateway.HttpIntegration(props.mcp.uri, {
          httpMethod,
          proxy: true,
          options: {
            credentialsPassthrough: true,
            connectionType: apigateway.ConnectionType.VPC_LINK,
            vpcLink,
            passthroughBehavior:
              apigateway.PassthroughBehavior.WHEN_NO_TEMPLATES,
            requestParameters: requestParameterMapping,
          },
        }),
        {
          authorizer,
          requestParameters,
        },
      );
    }

    const deployment = new apigateway.Deployment(this, "MCP-Deployment", {
      api: restApi,
      retainDeployments: true,
      description: "Deployment for Fargate MCP service integration",
    });
    // trick to trigger a new deployment by creating a unique ID every time
    // and explicit set the dependency and stage name
    deployment.node.addDependency(mcpResource);
    deployment.addToLogicalId(new Date().toISOString());
    (deployment as any).resource.stageName = props.envName;
  }

  /**
   * To establish a cross account access to an ALB in a different account,
   * a NLB needs to be setup and pointed to the IP addresses of the VPC endpoint.
   * The IP addresses of the VPC endpoint can not be retrieved in CDK code and
   * must be looked up in the console, then hard coded in the config.
   * The NLB can then be used to setup a VpcLink for the API Gateway resource definition.
   */
  private static createVpcLink(
    scope: Construct,
    props: ApiGatewayProps,
  ): apigateway.VpcLink {
    let vpc: ec2.IVpc;
    if (props.vpcLookup) {
      vpc = ec2.Vpc.fromVpcAttributes(scope, "MCP-VPCLookup", {
        vpcId: props.vpcId,
        availabilityZones: props.vpcLookup.availabilityZones,
        vpcCidrBlock: props.vpcLookup.vpcCidrBlock,
        privateSubnetIds: props.vpcLookup.privateSubnetIds,
        publicSubnetIds: [],
        isolatedSubnetIds: [],
      });
    } else {
      vpc = ec2.Vpc.fromLookup(scope, "MCP-VCPLookup", { vpcId: props.vpcId });
    }
    const endpointSecurityGroup = new ec2.SecurityGroup(
      scope,
      "MCP-VpcEndpointSecurityGroup",
      {
        vpc,
        allowAllOutbound: true,
        description: "Security group for MCP VPC Endpoint",
      },
    );

    endpointSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(443),
      "Allow HTTP from VPC",
    );

    new ec2.InterfaceVpcEndpoint(scope, "MCP-VpcEndpoint", {
      vpc,
      service: new ec2.InterfaceVpcEndpointService(
        props.mcp.vpcEndpointName,
        443,
      ),
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [endpointSecurityGroup],
      privateDnsEnabled: false,
    });

    const nlb = new elbv2.NetworkLoadBalancer(scope, "MCP-NLB", {
      vpc,
      internetFacing: false,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      loadBalancerName: "mcp-cross-account",
    });

    const targets = props.mcp.vpcEndpointIPAdresses.map(
      (ip) => new elbv2_targets.IpTarget(ip),
    );
    const targetGroup = new elbv2.NetworkTargetGroup(
      scope,
      "MCP-NLB-TargetGroup",
      {
        vpc,
        port: 443,
        protocol: elbv2.Protocol.TCP,
        targetType: elbv2.TargetType.IP,
        targets,
      },
    );

    nlb.addListener("MCP-NLB-Listener", {
      port: 443,
      protocol: elbv2.Protocol.TCP,
      defaultTargetGroups: [targetGroup],
    });

    const vpcLink = new apigateway.VpcLink(scope, "MCP-VpcLink", {
      vpcLinkName: "MCP-Cross-Account-Link",
      targets: [nlb],
    });

    return vpcLink;
  }
}
