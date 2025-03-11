import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class MovieReviewAPIStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define the Lambda function
    const getMovieReviewsLambda = new lambda.Function(this, 'GetMovieReviewsLambda', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'getMovieReviews.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambda')), // Adjust the path
      environment: {
        TABLE_NAME: 'MovieReviews', // DynamoDB table name
      },
    });

    // Grant the Lambda function read access to DynamoDB
    getMovieReviewsLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['dynamodb:Query'],
      resources: [`arn:aws:dynamodb:${this.region}:${this.account}:table/MovieReviews`],
    }));

    // Define the API Gateway
    const api = new apigateway.RestApi(this, 'MovieReviewAPI', {
      restApiName: 'Movie Review Service',
      description: 'This service manages movie reviews',
    });

    // Define the GET /movies/reviews endpoint
    const reviews = api.root.addResource('movies').addResource('reviews');
    reviews.addMethod('GET', new apigateway.LambdaIntegration(getMovieReviewsLambda), {
      requestParameters: {
        'method.request.querystring.movieId': true, // Ensure movieId is required
        'method.request.querystring.reviewId': false, // Optional reviewId
        'method.request.querystring.reviewerId': false, // Optional reviewerId
      },
      requestValidator: new apigateway.RequestValidator(this, 'QueryValidator', {
        restApi: api, // Reference the API here
        validateRequestParameters: true,
      }),
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
          'method.response.header.Access-Control-Allow-Methods': true,
        },
      }],
    });

    // Enable CORS for the API Gateway
    const mockIntegration = new apigateway.MockIntegration({
      integrationResponses: [{
        statusCode: '200',
        responseTemplates: {
          'application/json': '{"statusCode": 200}',
        },
      }],
      requestTemplates: { 
        'application/json': '{"statusCode": 200}' 
      },
    });

    // Add OPTIONS method to root (CORS support)
    api.root.addMethod('OPTIONS', mockIntegration, {
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
          'method.response.header.Access-Control-Allow-Methods': true,
        },
      }],
    });

    // Add OPTIONS method to /movies/reviews resource (CORS support)
    reviews.addMethod('OPTIONS', mockIntegration, {
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
          'method.response.header.Access-Control-Allow-Methods': true,
        },
      }],
    });
  }
}
