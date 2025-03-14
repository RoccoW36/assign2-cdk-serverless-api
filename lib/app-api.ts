import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import { generateBatch } from "../shared/util";
import { movieReviews } from "../seed/movieReviews";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as path from "path";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { AppApiProps } from "../shared/types";

export class AppAPI extends Construct {
  constructor(scope: Construct, id: string, props: AppApiProps) {
    super(scope, id);

    // Common Lambda properties
    const appCommonFnProps = {
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      runtime: lambda.Runtime.NODEJS_22_X,
      environment: {
        USER_POOL_ID: props.userPoolId,
        CLIENT_ID: props.userPoolClientId,
        REGION: cdk.Aws.REGION,
      },
    };

    // Create API Gateway
    const appApi = new apig.RestApi(this, "AppApi", {
      description: "App RestApi",
      deployOptions: { stageName: "dev" },
      endpointTypes: [apig.EndpointType.REGIONAL],
      defaultCorsPreflightOptions: {
        allowOrigins: apig.Cors.ALL_ORIGINS,
      },
    });

    // Create DynamoDB Table
    const movieReviewsTable = new dynamodb.Table(this, "MovieReviewsTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "movieId", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "reviewId", type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "MovieReviews",
    });

    // Add Global Secondary Index
    movieReviewsTable.addGlobalSecondaryIndex({
      indexName: "ReviewerIndex",
      partitionKey: { name: "reviewerId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "reviewDate", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Seed Data using custom resource
    new custom.AwsCustomResource(this, "reviewsddbInitData", {
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",
        parameters: {
          RequestItems: {
            [movieReviewsTable.tableName]: generateBatch(movieReviews),
          },
        },
        physicalResourceId: custom.PhysicalResourceId.of("reviewsddbInitData"),
      },
      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [movieReviewsTable.tableArn],
      }),
    });

    // Create Lambda Authorizer
    const authorizerFn = this.createLambda("AuthorizerFn", "./lambdas/auth/authorizer.ts");

    const requestAuthorizer = new apig.RequestAuthorizer(this, "RequestAuthorizer", {
      identitySources: [apig.IdentitySource.header("cookie")],
      handler: authorizerFn,
      resultsCacheTtl: cdk.Duration.minutes(0),
    });

    // Create Lambda function helper
    const createLambda = (id: string, entry: string, additionalEnv?: Record<string, string>) =>
      new lambdanode.NodejsFunction(this, id, {
        ...appCommonFnProps,
        entry,
        environment: {
          ...appCommonFnProps.environment,
          TABLE_NAME: movieReviewsTable.tableName,
          ...additionalEnv,
        },
      });

    // Define Lambda functions
    const getAllMovieReviewsFn = createLambda("getAllMovieReviewsFn", path.join(__dirname, "../lambdas/getAllMovieReviews.ts"), {
      GSI_REVIEWER_INDEX: "ReviewerIndex",
    });
    const getMovieReviewByIdFn = createLambda("getMovieReviewByIdFn", path.join(__dirname, "../lambdas/getMovieReviewById.ts"));
    const addMovieReviewFn = createLambda("AddMovieReviewFn", path.join(__dirname, "../lambdas/addMovieReview.ts"));
    const updateMovieReviewFn = createLambda("UpdateMovieReviewFn", path.join(__dirname, "../lambdas/updateMovieReview.ts"));
    const translateMovieReviewFn = createLambda("TranslateMovieReviewFn", path.join(__dirname, "../lambdas/translateMovieReview.ts"));

    // Grant permissions
    movieReviewsTable.grantReadData(getAllMovieReviewsFn);
    movieReviewsTable.grantReadData(getMovieReviewByIdFn);
    movieReviewsTable.grantReadWriteData(addMovieReviewFn);
    movieReviewsTable.grantReadWriteData(updateMovieReviewFn);
    movieReviewsTable.grantReadWriteData(translateMovieReviewFn);

    translateMovieReviewFn.addToRolePolicy(
      new PolicyStatement({
        actions: ["translate:TranslateText"],
        resources: ["*"],
      })
    );

    // REST API Setup
    const movieReviewsEndpoint = appApi.root.addResource("movies");
    const specificMovieEndpoint = movieReviewsEndpoint.addResource("{movieId}");
    const movieReviewsByMovieId = specificMovieEndpoint.addResource("reviews");
    const reviewResource = movieReviewsByMovieId.addResource("{reviewId}");
    const translateReviewResource = reviewResource.addResource("translate").addResource("{language}");

    // API Gateway Methods
    movieReviewsEndpoint.addResource("all-reviews").addMethod("GET", new apig.LambdaIntegration(getAllMovieReviewsFn));
    movieReviewsByMovieId.addMethod("GET", new apig.LambdaIntegration(getMovieReviewByIdFn));
    translateReviewResource.addMethod("GET", new apig.LambdaIntegration(translateMovieReviewFn));
    movieReviewsByMovieId.addMethod("POST", new apig.LambdaIntegration(addMovieReviewFn), {
      authorizer: requestAuthorizer,
      authorizationType: apig.AuthorizationType.CUSTOM,
    });
    reviewResource.addMethod("PUT", new apig.LambdaIntegration(updateMovieReviewFn), {
      authorizer: requestAuthorizer,
      authorizationType: apig.AuthorizationType.CUSTOM,
    });
  }

  // Helper function to create Lambda functions with common props
  private createLambda(id: string, entry: string, additionalEnv?: Record<string, string>) {
    return new lambdanode.NodejsFunction(this, id, {
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      runtime: lambda.Runtime.NODEJS_22_X,
      environment: {
        REGION: cdk.Aws.REGION,
        ...additionalEnv,
      },
      entry,
    });
  }
}
