import * as cdk from "aws-cdk-lib";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface ApiAccess {
  readonly account?: string;
  readonly role_arn?: string;
}

export interface SecretsProps {
  readonly mcpServerApiAccess: ApiAccess[];
  readonly envName: string;
  readonly regionShort: string;
}

export interface ApiCredentials {
  readonly secretArn: string;
  readonly encryptionKeyArn: string;
  readonly apiKeyHeaderName: string;
  readonly apiKeyFieldName: string;
  readonly apiKeyFieldValue: string;
}

export function lookupDataDogKeySecret(
  scope: Construct,
  envName: string,
): secretsmanager.ISecret {
  return secretsmanager.Secret.fromSecretNameV2(
    scope,
    "DD_API_KEY",
    `datadog-opp-solutions-${envName}`,
  );
}

export class Secrets extends Construct {
  public readonly mcpServerApiCredentials: ApiCredentials;

  constructor(scope: Construct, id: string, props: SecretsProps) {
    super(scope, id);

    this.mcpServerApiCredentials = Secrets.createApiCredentials(
      this,
      props.mcpServerApiAccess,
      {
        apiKeyHeaderName: "X-MCP-API-Key",
        secretName: "OPPSolutions/MCP/APIKey",
        secretId: "MCPServerAPIKeySecret",
        encryptionKeyAlias: "OPPSolutions/MCP/EncryptionKey",
        encryptionKeyId: "MCPServerAPIEncryptionKey",
        secretPurpose: "MCP Server API",
      },
    );
  }

  private static createApiCredentials(
    scope: Construct,
    props: ApiAccess[],
    options: {
      apiKeyHeaderName: string;
      secretName: string;
      secretId: string;
      encryptionKeyAlias: string;
      encryptionKeyId: string;
      secretPurpose: string;
    },
  ): ApiCredentials {
    const {
      apiKeyHeaderName,
      secretName,
      secretId,
      encryptionKeyAlias,
      encryptionKeyId,
      secretPurpose,
    } = options;

    const API_KEY_FIELD_NAME = "headerFieldName";
    const API_KEY_FIELD_VALUE = "headerFieldValue";

    const encryptionKey = new cdk.aws_kms.Key(scope, encryptionKeyId, {
      alias: encryptionKeyAlias,
      enableKeyRotation: true,
      description: `Key for encrypting ${secretPurpose}`,
    });

    const apiKeySecret = new secretsmanager.Secret(scope, secretId, {
      secretName,
      encryptionKey,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          [API_KEY_FIELD_NAME]: apiKeyHeaderName,
        }),
        generateStringKey: API_KEY_FIELD_VALUE,
        excludePunctuation: true,
        excludeCharacters: '"@/\\',
      },
      description: `Key for securing access to the ${secretPurpose}`,
    });

    for (const keyAccess of props) {
      const principal = keyAccess.role_arn
        ? new iam.ArnPrincipal(keyAccess.role_arn)
        : new iam.AccountPrincipal(keyAccess.account);

      encryptionKey.addToResourcePolicy(
        new iam.PolicyStatement({
          actions: ["kms:Decrypt", "kms:DescribeKey"],
          principals: [principal],
          resources: ["*"],
        }),
      );

      apiKeySecret.grantRead(principal);
    }

    return {
      secretArn: apiKeySecret.secretArn,
      encryptionKeyArn: encryptionKey.keyArn,
      apiKeyHeaderName,
      apiKeyFieldName: API_KEY_FIELD_NAME,
      apiKeyFieldValue: API_KEY_FIELD_VALUE,
    };
  }
}
