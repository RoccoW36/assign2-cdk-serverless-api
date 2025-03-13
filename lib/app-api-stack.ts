import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { generateBatch } from "../shared/util";
import { movieReviews } from "../seed/movieReviews";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as certmgr from "aws-cdk-lib/aws-certificatemanager";
import * as s3 from "aws-cdk-lib/aws-s3";

// Create the AppAPIStack
export class AppAPIStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Movie Reviews Table
    const movieReviewsTable = new dynamodb.Table(this, "MovieReviewsTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "movieId", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "reviewId", type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "MovieReviews",
    });

    // Global Secondary Index (GSI) for querying by reviewerId
    movieReviewsTable.addGlobalSecondaryIndex({
      indexName: "ReviewerIndex",
      partitionKey: { name: "reviewerId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "reviewDate", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Seed Movie Reviews Data
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

    // Lambda function configurations
    const lambdaConfig = {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: movieReviewsTable.tableName,
        REGION: "eu-west-1",
      },
    };

    // Define Lambda functions
    const getMovieReviewByIdFn = new lambdanode.NodejsFunction(this, "getMovieReviewByIdFn", {
      ...lambdaConfig,
      entry: `${__dirname}/../lambdas/getMovieReviewById.ts`,
    });

    const getAllMovieReviewsFn = new lambdanode.NodejsFunction(this, "getAllMovieReviewsFn", {
      ...lambdaConfig,
      entry: `${__dirname}/../lambdas/getAllMovieReviews.ts`,
      environment: {
        ...lambdaConfig.environment,
        GSI_REVIEWER_INDEX: "ReviewerIndex",
      },
    });

    const addMovieReviewFn = new lambdanode.NodejsFunction(this, "AddMovieReviewFn", {
      ...lambdaConfig,
      entry: `${__dirname}/../lambdas/addMovieReview.ts`,
    });

    const updateMovieReviewFn = new lambdanode.NodejsFunction(this, "UpdateMovieReviewFn", {
      ...lambdaConfig,
      entry: `${__dirname}/../lambdas/updateMovieReview.ts`,
    });

    const translateMovieReviewFn = new lambdanode.NodejsFunction(this, "TranslateMovieReviewFn", {
      ...lambdaConfig,
      entry: `${__dirname}/../lambdas/translateMovieReview.ts`,
    });

    // Grant permissions to Lambda functions for accessing DynamoDB
    movieReviewsTable.grantReadData(getMovieReviewByIdFn);
    movieReviewsTable.grantReadData(getAllMovieReviewsFn);
    movieReviewsTable.grantReadWriteData(addMovieReviewFn);
    movieReviewsTable.grantReadWriteData(updateMovieReviewFn);
    movieReviewsTable.grantReadWriteData(translateMovieReviewFn);

    // Allow Lambda function to use Amazon Translate
    translateMovieReviewFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["translate:TranslateText"],
        resources: ["*"],
      })
    );

    // REST API Setup
    const api = new apig.RestApi(this, "RestAPI", {
      description: "Movie API",
      deployOptions: {
        stageName: "dev",
      },
      defaultCorsPreflightOptions: {
        allowHeaders: ["Content-Type", "X-Amz-Date"],
        allowMethods: ["OPTIONS", "GET", "POST", "PUT"],
        allowCredentials: true,
        allowOrigins: ["*"],
      },
    });

    // Define API Resources
    const movieReviewsEndpoint = api.root.addResource("movies");
    const specificMovieEndpoint = movieReviewsEndpoint.addResource("{movieId}");
    const movieReviewsByMovieId = specificMovieEndpoint.addResource("reviews");
    const reviewResource = movieReviewsByMovieId.addResource("{reviewId}");

    // Define the translate review resource under reviewResource with language parameter
    const translateReviewResource = reviewResource.addResource("translate").addResource("{language}");

    // API Gateway Methods
    const allReviewsResource = movieReviewsEndpoint.addResource("all-reviews");
    allReviewsResource.addMethod("GET", new apig.LambdaIntegration(getAllMovieReviewsFn, { proxy: true }));
    movieReviewsByMovieId.addMethod("GET", new apig.LambdaIntegration(getMovieReviewByIdFn, { proxy: true }));
    movieReviewsByMovieId.addMethod("POST", new apig.LambdaIntegration(addMovieReviewFn, { proxy: true }));
    reviewResource.addMethod("PUT", new apig.LambdaIntegration(updateMovieReviewFn, { proxy: true }));
    translateReviewResource.addMethod("GET", new apig.LambdaIntegration(translateMovieReviewFn, { proxy: true }));
       
    
  }
}
