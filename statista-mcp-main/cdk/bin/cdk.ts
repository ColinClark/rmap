#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { AppStage } from "../lib/appStage";
import { ENV_DEV, ENV_PROD, ENV_STAGE } from "./../lib/config";

const app = new cdk.App();

new AppStage(app, "DEV", ENV_DEV);
new AppStage(app, "STAGE", ENV_STAGE);
new AppStage(app, "PROD", ENV_PROD);
