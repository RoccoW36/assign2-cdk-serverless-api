import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as node from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "path";
import { AuthApiProps } from "../shared/types";

export class AuthApi extends Construct {
  private readonly userPoolId: string;
  private readonly userPoolClientId: string;
  private readonly auth: apigateway.IResource;
  public readonly authUrl: string;

  constructor(scope: Construct, id: string, props: AuthApiProps) {
    super(scope, id);

    this.userPoolId = props.userPoolId;
    this.userPoolClientId = props.userPoolClientId;

    // Create a new API Gateway instance for Auth API
    const api = new apigateway.RestApi(this, "AuthServiceApi", {
      restApiName: "Auth API",
      deployOptions: { stageName: "dev" },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ["OPTIONS", "POST"],
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
      },
    });

    // Initialize the `auth` resource under the root of the API
    this.auth = api.root.addResource("auth"); 
    this.authUrl = `${api.url}auth`;

    // Define the routes for authentication (signup, signin, etc.)
    this.addAuthRoute(api, "signup", "signup");
    this.addAuthRoute(api, "signin", "signin");
    this.addAuthRoute(api, "confirm_signup", "confirm-signup");
    this.addAuthRoute(api, "signout", "signout");
  }

  private addAuthRoute(api: apigateway.RestApi, resourceName: string, functionName: string): void {
    const lambdaFn = new node.NodejsFunction(this, `${functionName}Fn`, {
      entry: path.join(__dirname, `../lambdas/auth/${functionName}.ts`),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_18_X,
      memorySize: 128,
      timeout: cdk.Duration.seconds(10),
      architecture: lambda.Architecture.ARM_64,
      environment: {
        USER_POOL_ID: this.userPoolId,
        CLIENT_ID: this.userPoolClientId,
        REGION: cdk.Aws.REGION,
      },
    });

    const resource = this.auth.addResource(resourceName);
    resource.addMethod("POST", new apigateway.LambdaIntegration(lambdaFn));
  }
}
