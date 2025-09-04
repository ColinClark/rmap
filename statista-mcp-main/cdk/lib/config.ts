import { AppStageProps } from "./appStage";

// OPP solutions AWS accounts
export const DEV_ACCOUNT = "697244795087";
export const STAGE_ACCOUNT = "796973485207";
export const PROD_ACCOUNT = "910148267211";

// global-search AWS accounts
export const GS_DEV_ACCOUNT = "578944296431";
export const GS_STAGE_ACCOUNT = "224055217938";
export const GS_PROD_ACCOUNT = "240391125564";

export const DEV_ENV_NAME = "dev";
export const STAGE_ENV_NAME = "stage";
export const PROD_ENV_NAME = "prod";

export const EUC1 = "eu-central-1";
export const EUC1_SHORT = "euc1";

/////
// DEV
export const ENV_DEV = <AppStageProps>{
  euc1: {
    enabled: true,
    envName: DEV_ENV_NAME,
    regionShort: EUC1_SHORT,
    env: { account: DEV_ACCOUNT, region: EUC1 },
    vpc: {
      vpcId: "vpc-0f0db8569dd05c6b6",
      privateSubnetIds: [
        "subnet-0bd3738fd0d1978b3",
        "subnet-0e0bf012622c8bf7f",
        "subnet-0597c142e5141feca",
      ],
      privateSubnetRouteTableIds: [
        "rtb-0934d208c57352c33",
        "rtb-0096294f4c3f8d2c8",
        "rtb-0151474106098f828",
      ],
      transitGatewayId: "tgw-037b5961d23fd9bb9",
    },
    bastionHostEnabled: true,
    searchEndpointURL:
      "https://api.globalsearch.dev.aws.statista.com/v1/canva/statistics",
    dataEndpointURL:
      "https://api.globalsearch.dev.aws.statista.com/v1/data/statistic",
    cluster: {
      numberOfTasks: 1,
      memoryLimitMiB: 1024,
      cpu: 256,
    },
    hostedZoneAttributes: {
      zoneName: "mcp.opp-solutions.dev.aws.statista.com",
      hostedZoneId: "Z070369817J69M7RHOMPY",
    },
    mcpServerApiAccess: [
      {
        account: GS_DEV_ACCOUNT,
      },
    ],
  },
};

/////
// STAGE
export const ENV_STAGE = <AppStageProps>{
  euc1: {
    enabled: false,
    envName: STAGE_ENV_NAME,
    regionShort: EUC1_SHORT,
    env: { account: STAGE_ACCOUNT, region: EUC1 },
    vpc: {
      vpcId: "",
      privateSubnetIds: ["", "", ""],
      privateSubnetRouteTableIds: ["", "", ""],
      transitGatewayId: "",
    },
    searchEndpointURL:
      "https://api.globalsearch.stage.aws.statista.com/v1/canva/statistics",
    dataEndpointURL:
      "https://api.globalsearch.stage.aws.statista.com/v1/data/statistic",
    cluster: {
      numberOfTasks: 1,
      memoryLimitMiB: 512,
      cpu: 256,
    },
    hostedZoneAttributes: {
      zoneName: "mcp.opp-solutions.stage.aws.statista.com",
      hostedZoneId: "",
    },
    mcpServerApiAccess: [
      {
        account: GS_STAGE_ACCOUNT,
      },
    ],
  },
};

////
// PROD
export const ENV_PROD = <AppStageProps>{
  euc1: {
    enabled: true,
    envName: PROD_ENV_NAME,
    regionShort: EUC1_SHORT,
    env: { account: PROD_ACCOUNT, region: EUC1 },
    vpc: {
      vpcId: "vpc-08b1c64302e3f740b",
      privateSubnetIds: [
        "subnet-0202aa8467b9ad014",
        "subnet-0d0295a95700b55b6",
        "subnet-02ac1c610b4f2d02d",
      ],
      privateSubnetRouteTableIds: [
        "rtb-01a1f34ff5f0483f5",
        "rtb-0fa1147d328ac2228",
        "rtb-02f59242de6cd6c1d",
      ],
      transitGatewayId: "tgw-037b5961d23fd9bb9",
    },
    searchEndpointURL: "https://api.statista.ai/v1/canva/statistics",
    dataEndpointURL: "https://api.statista.ai/v1/data/statistic",
    cluster: {
      numberOfTasks: 1,
      memoryLimitMiB: 512,
      cpu: 256,
    },
    hostedZoneAttributes: {
      zoneName: "mcp.opp-solutions.prod.aws.statista.com",
      hostedZoneId: "Z04424083QQCACEF7UBMY",
    },
    mcpServerApiAccess: [
      {
        account: GS_PROD_ACCOUNT,
      },
    ],
  },
};
