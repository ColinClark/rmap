import * as cdk from "aws-cdk-lib";

import { Construct } from "constructs";
import { VpcExtension, VpcExtensionProps } from "./vpc";
import { GitHubActions } from "./github";
import { ApiAccess, Secrets } from "./secrets";
import { BastionHost } from "./bastion_host";

interface CoreStackProps extends cdk.StackProps, VpcExtensionProps {
  readonly envName: string;
  readonly regionShort: string;
  readonly bastionHostEnabled: boolean | undefined;
  readonly mcpServerApiAccess: ApiAccess[];
}

export class CoreStack extends cdk.Stack {
  readonly vpcExtension: VpcExtension;
  readonly secrets: Secrets;

  constructor(scope: Construct, id: string, props: CoreStackProps) {
    super(scope, id, props);

    // deploy the Role only once per account
    if (props.regionShort === "euc1") {
      new GitHubActions(this, "GitHubActions");
    }

    this.vpcExtension = new VpcExtension(this, "VpcExtension", props);

    if (props.bastionHostEnabled || false) {
      new BastionHost(this, "Bastion", props.vpc);
    }

    this.secrets = new Secrets(this, "Secrets", props);
  }
}
