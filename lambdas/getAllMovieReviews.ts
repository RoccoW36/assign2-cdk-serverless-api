import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const TABLE_NAME = process.env.TABLE_NAME!;
const GSI_REVIEWER_INDEX = process.env.GSI_REVIEWER_INDEX!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS,GET",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("Event: ", JSON.stringify(event));

    // Handle OPTIONS request for CORS preflight
    if ((event as any).httpMethod === "OPTIONS") { 
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: "Preflight request handled." }),
      };
    }

    const reviewerId = event.queryStringParameters?.reviewerId;
    let response;

    if (reviewerId) {
      // Use GSI to filter by reviewerId
      response = await ddbDocClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: GSI_REVIEWER_INDEX,
          KeyConditionExpression: "reviewerId = :reviewerId",
          ExpressionAttributeValues: { ":reviewerId": reviewerId },
        })
      );
    } else {
      // Scan full table if no reviewerId is provided
      response = await ddbDocClient.send(
        new ScanCommand({ TableName: TABLE_NAME })
      );
    }

    if (!response.Items || response.Items.length === 0) {
      return {
        statusCode: 404,
        headers: { ...CORS_HEADERS, "content-type": "application/json" },
        body: JSON.stringify({ message: "No reviews found" }),
      };
    }

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, "content-type": "application/json" },
      body: JSON.stringify({ data: response.Items }),
    };
  } catch (error: any) {
    console.error("Error fetching movie reviews:", error);
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, "content-type": "application/json" },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
