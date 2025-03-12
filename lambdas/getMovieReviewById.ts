import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand, GetCommandOutput, QueryCommandOutput } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));
    const pathParameters = event?.pathParameters;
    const movieId = pathParameters?.movieId ? parseInt(pathParameters.movieId) : undefined;
    const reviewId = event.queryStringParameters?.reviewId ? parseInt(event.queryStringParameters.reviewId) : undefined;

    if (!movieId) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Missing movie Id" }),
      };
    }

    let movieCommandOutput: GetCommandOutput | QueryCommandOutput;

    if (reviewId) {
      // Fetch specific review by reviewId
      movieCommandOutput = await ddbDocClient.send(
        new GetCommand({
          TableName: process.env.TABLE_NAME,
          Key: { movieId: movieId, reviewId: reviewId },
        })
      );
    } else {
      // Fetch all reviews for the movieId
      movieCommandOutput = await ddbDocClient.send(
        new QueryCommand({
          TableName: process.env.TABLE_NAME,
          KeyConditionExpression: "movieId = :movieId",
          ExpressionAttributeValues: {
            ":movieId": movieId,
          },
        })
      );
    }

    console.log("DynamoDB response: ", movieCommandOutput);

    if ("Item" in movieCommandOutput) {
      // GetCommand response: Single item
      if (!movieCommandOutput.Item) {
        return {
          statusCode: 404,
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ Message: "Review not found" }),
        };
      }

      return {
        statusCode: 200,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          data: movieCommandOutput.Item,
        }),
      };
    } else if ("Items" in movieCommandOutput) {
      // QueryCommand response: Multiple items
      if (!movieCommandOutput.Items || movieCommandOutput.Items.length === 0) {
        return {
          statusCode: 404,
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ Message: "No reviews found for the movie" }),
        };
      }

      return {
        statusCode: 200,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          data: movieCommandOutput.Items,
        }),
      };
    }

    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ Message: "Unexpected error" }),
    };
  } catch (error: any) {
    console.log("Error: ", JSON.stringify(error));
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error: error.message }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
