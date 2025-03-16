import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const TABLE_NAME = process.env.TABLE_NAME!;
const GSI_REVIEWER_INDEX = "ReviewerIndex";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));

    const pathParameters = event?.pathParameters;
    const movieId = pathParameters?.movieId ? parseInt(pathParameters.movieId) : undefined;
    const reviewerId = event.queryStringParameters?.reviewerId;

    if (!movieId) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Missing movieId in request" }),
      };
    }

    let response;

    if (reviewerId) {
      // Query using the GSI with movieId and reviewerId
      response = await ddbDocClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: GSI_REVIEWER_INDEX,
          KeyConditionExpression: "movieId = :movieId and reviewerId = :reviewerId",
          ExpressionAttributeValues: {
            ":movieId": movieId,
            ":reviewerId": reviewerId,
          },
        })
      );
    } else {
      // Query using the primary index with only movieId
      response = await ddbDocClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: "movieId = :movieId",
          ExpressionAttributeValues: { ":movieId": movieId },
        })
      );
    }

    if (!response.Items || response.Items.length === 0) {
      return {
        statusCode: 404,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "No reviews found for this movie" }),
      };
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: response.Items }),
    };
  } catch (error: any) {
    console.error("Error fetching movie reviews:", error);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
