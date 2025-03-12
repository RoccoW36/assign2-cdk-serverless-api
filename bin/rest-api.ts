#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { AppAPIStack } from "../lib/app-api-stack";

const app = new cdk.App();
new AppAPIStack(app, "AppAPIStack", { env: { region: "eu-west-1" } });
