import * as cdk from "aws-cdk-lib";
import * as route53 from "aws-cdk-lib/aws-route53";
import { Construct } from "constructs";

import { CoreStack } from "./core";
import { VpcExtensionProps } from "./vpc";
import { MCPClusterProps, MCPStack } from "./mcp-stack";
import { ApiAccess } from "./secrets";

export interface AppStageRegionalProps
  extends cdk.StackProps,
    VpcExtensionProps {
  readonly enabled: boolean;
  readonly envName: string;
  readonly regionShort: string;
  readonly bastionHostEnabled: boolean | undefined;
  readonly searchEndpointURL: string;
  readonly dataEndpointURL: string;
  readonly cluster: MCPClusterProps;
  readonly hostedZoneAttributes: route53.HostedZoneAttributes;
  readonly mcpServerApiAccess: ApiAccess[];
}

export interface AppStageProps extends cdk.StageProps {
  readonly euc1: AppStageRegionalProps;
}

export class AppStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props: AppStageProps) {
    super(scope, id, props);

    for (const [_, regionProps] of Object.entries(props)) {
      if (regionProps.enabled) {
        const core = new CoreStack(this, "Core", {
          ...regionProps,
          description: "VPC Extension, Github Actions, Secrets, ...",
        });

        const mcpProps = {
          ...regionProps,
          mcpServerApiCredentials: core.secrets.mcpServerApiCredentials,
        };
        new MCPStack(this, "MCP", mcpProps);
      }
    }
    cdk.Tags.of(this).add("Application", "MCP-Server");
  }
}
