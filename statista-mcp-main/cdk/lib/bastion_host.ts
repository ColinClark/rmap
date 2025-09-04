import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { lookupVpc, VpcLookupProps } from "./vpc";

export class BastionHost extends Construct {
  constructor(scope: Construct, id: string, props: VpcLookupProps) {
    super(scope, id);

    const vpc = lookupVpc(this, props);

    const name = "BastionHost-SecurityGroup";
    const securityGroup = new ec2.SecurityGroup(scope, name, {
      vpc,
      allowAllOutbound: true,
      securityGroupName: name,
    });

    const bastionHost = new ec2.BastionHostLinux(scope, "BastionHost", {
      vpc,
      securityGroup: securityGroup,
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.NANO,
      ),

      blockDevices: [
        {
          deviceName: "/dev/xvda",
          volume: ec2.BlockDeviceVolume.ebs(10, {
            encrypted: true,
          }),
        },
      ],
    });

    bastionHost.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "AmazonSSMManagedInstanceCore",
      ),
    );
  }
}
