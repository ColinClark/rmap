import * as cdk from "aws-cdk-lib";
import { aws_ec2 as ec2 } from "aws-cdk-lib";
import { CfnRoute } from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface VpcLookupProps {
  readonly vpcId: string;
  readonly privateSubnetIds: string[];
  readonly privateSubnetRouteTableIds: string[];
  readonly transitGatewayId: string;
}

export interface VpcExtensionProps {
  readonly envName: string;
  readonly regionShort: string;
  readonly vpc: VpcLookupProps;
}

export function lookupVpc(scope: Construct, props: VpcLookupProps) {
  const vpcLookUp = ec2.Vpc.fromLookup(scope, "VpcLookUp", {
    vpcId: props.vpcId,
  });

  const vpc = ec2.Vpc.fromVpcAttributes(scope, "VPC", {
    vpcId: props.vpcId,
    availabilityZones: vpcLookUp.availabilityZones,
    vpcCidrBlock: vpcLookUp.vpcCidrBlock,
    privateSubnetIds: props.privateSubnetIds,
    privateSubnetRouteTableIds: props.privateSubnetRouteTableIds,
    publicSubnetIds: [],
    isolatedSubnetIds: [],
  });
  return vpc;
}
/**
 * Due to the way the accounts are set up, we cannot rely on CDK internal look up on private
 * and public subnets. As a consequence, we were unable to rely on L3 constructs that internally
 * rely on this lookup. Hence, we get the VPC and wrap it. In this wrapper we pre-select
 * the private subnets (hardcoded in config)
 */
export class VpcExtension extends Construct {
  readonly s3Endpoint: ec2.GatewayVpcEndpoint;
  readonly endpointsSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: VpcExtensionProps) {
    super(scope, id);

    const vpc = lookupVpc(scope, props.vpc);

    // Allow internet traffic through the gateway (central networking account)
    // Note: We introduced this with Robert to allow Fargate Tasks to pull the datadog/agent image from a
    // public ECR Repo.
    for (const rt of props.vpc.privateSubnetRouteTableIds) {
      new CfnRoute(scope, `EgressRoute-${props.regionShort}-${rt}`, {
        routeTableId: rt,
        transitGatewayId: props.vpc.transitGatewayId,
        destinationCidrBlock: "0.0.0.0/0",
      });
    }

    this.endpointsSecurityGroup = new ec2.SecurityGroup(
      scope,
      "VPCEndpointSecurityGroup",
      {
        vpc,
        allowAllOutbound: true,
        description: "Security group for VPC Endpoints",
      },
    );

    this.endpointsSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(443),
      "Allow HTTPS traffic in",
    );

    const ecrDockerEndpoint = vpc.addInterfaceEndpoint("ECRDockerEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
      privateDnsEnabled: true,
      securityGroups: [this.endpointsSecurityGroup],
    });

    ecrDockerEndpoint.addToPolicy(
      new iam.PolicyStatement({
        principals: [new iam.AnyPrincipal()],
        actions: [
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer",
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
        ],
        effect: iam.Effect.ALLOW,
        resources: ["*"],
      }),
    );

    vpc.addInterfaceEndpoint("ECRApiEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.ECR,
      privateDnsEnabled: true,
      securityGroups: [this.endpointsSecurityGroup],
    });

    this.s3Endpoint = vpc.addGatewayEndpoint("S3Endpoint", {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    const region = cdk.Stack.of(this).region;
    this.s3Endpoint.addToPolicy(
      new iam.PolicyStatement({
        principals: [new iam.AnyPrincipal()],
        actions: ["s3:GetBucketLocation", "s3:ListBucket", "s3:GetObject"],
        resources: [
          // Has nothing to do with "our prod". These are AWS internals connected to how ECR pulls layers from S3
          `arn:aws:s3:::prod-${region}-starport-layer-bucket`,
          `arn:aws:s3:::prod-${region}-starport-layer-bucket/*`,
        ],
      }),
    );

    vpc.addInterfaceEndpoint(
      `CloudWatch-Monitor-Endpoint-${props.regionShort}`,
      {
        service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_MONITORING,
        privateDnsEnabled: true,
        securityGroups: [this.endpointsSecurityGroup],
      },
    );

    const cloudWatchLogsEndpoint = vpc.addInterfaceEndpoint(
      "CloudWatchLogsEndpoint",
      {
        service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
        privateDnsEnabled: true,
        securityGroups: [this.endpointsSecurityGroup],
      },
    );
    cloudWatchLogsEndpoint.addToPolicy(
      new iam.PolicyStatement({
        principals: [new iam.AnyPrincipal()],
        actions: ["logs:CreateLogStream", "logs:PutLogEvents"],
        resources: ["*"],
      }),
    );

    vpc.addInterfaceEndpoint("SecretsManagerEnpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      privateDnsEnabled: true,
      securityGroups: [this.endpointsSecurityGroup],
    });

    vpc.addInterfaceEndpoint("ECSEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.ECS,
      privateDnsEnabled: true,
      securityGroups: [this.endpointsSecurityGroup],
    });

    // Needed for SessionsManager access to bastion host
    vpc.addInterfaceEndpoint("SSMEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.SSM,
      privateDnsEnabled: true,
      securityGroups: [this.endpointsSecurityGroup],
    });

    vpc.addInterfaceEndpoint("EC2MessagesEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.EC2_MESSAGES,
      privateDnsEnabled: true,
      securityGroups: [this.endpointsSecurityGroup],
    });

    vpc.addInterfaceEndpoint("SSMMessagesEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES,
      privateDnsEnabled: true,
      securityGroups: [this.endpointsSecurityGroup],
    });
  }
}
