import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { UserPool } from "aws-cdk-lib/aws-cognito";
import { AuthApi } from "./auth-api";
import { AppAPI } from "./app-api";
import { FrontendApp } from "./frontend-app";

export class FullStackApp extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Cognito User Pool
    const userPool = new UserPool(this, "UserPool", {
      signInAliases: { username: true, email: true },
      selfSignUpEnabled: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const appClient = userPool.addClient("AppClient", {
      authFlows: { userPassword: true },
    });

    // Backend APIs
    const authApi = new AuthApi(this, "AuthServiceApi", {
      userPoolId: userPool.userPoolId,
      userPoolClientId: appClient.userPoolClientId,
    });

    const appApi = new AppAPI(this, "AppApi", {
      userPoolId: userPool.userPoolId,
      userPoolClientId: appClient.userPoolClientId,
    });

    // Frontend
    new FrontendApp(this, "FrontendApp", {
      apiUrl: appApi.apiUrl,
      authUrl: authApi.authUrl,
    });
  }
}
