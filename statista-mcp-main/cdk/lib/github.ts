import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export class GitHubActions extends Construct {
  private static GITHUB_TOKEN_HOST = "token.actions.githubusercontent.com";
  private static GITHUB_REPO = "PIT-Search-API/statista-mcp";
  private static GITHUB_REPO_SLUG = GitHubActions.GITHUB_REPO.replace(
    /[^a-zA-Z0-9]/g,
    "-",
  );

  /**
   * Creates a role in the AWS account with established trust relationship to GitHub.
   * This allows GitHub Actions to deploy resources on AWS.
   * Re-uses the existing Provider
   */
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const githubOidcProvider = new iam.OpenIdConnectProvider(
      this,
      "GitHubOIDCProvider",
      {
        url: `https://${GitHubActions.GITHUB_TOKEN_HOST}`,
        clientIds: ["sts.amazonaws.com"],
      },
    );

    new iam.Role(this, "GitHubActionRole", {
      roleName: `GitHubActionRole-${GitHubActions.GITHUB_REPO_SLUG}`,
      description: "IAM role for GitHub Actions",
      maxSessionDuration: cdk.Duration.hours(1),
      assumedBy: new iam.WebIdentityPrincipal(
        githubOidcProvider.openIdConnectProviderArn,
        {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          },
          StringLike: {
            "token.actions.githubusercontent.com:sub": `repo:${GitHubActions.GITHUB_REPO}:*`,
          },
        },
      ),
      inlinePolicies: {
        AssumeBootstrap: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ["sts:AssumeRole"],
              conditions: {
                StringEquals: {
                  "iam:ResourceTag/aws-cdk:bootstrap-role": [
                    "deploy",
                    "lookup",
                    "file-publishing",
                    "image-publishing",
                  ],
                },
              },
              resources: ["*"],
              effect: iam.Effect.ALLOW,
            }),
          ],
        }),
        // Get Auth Token to register to ECR and be able to push and pull Images
        ECRAuth: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ["ecr:GetAuthorizationToken"],
              resources: ["*"],
              effect: iam.Effect.ALLOW,
            }),
          ],
        }),
      },
    });

    cdk.Tags.of(this).add("Purpose", "Deploy from GitHub Actions");
  }
}
