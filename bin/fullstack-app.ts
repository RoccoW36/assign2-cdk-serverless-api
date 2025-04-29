#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { FullStackApp } from "../lib/fullstack-app-stack";

const app = new cdk.App();

new FullStackApp(app, "FullStackApp", {
  env: { region: "eu-west-1" },
});
