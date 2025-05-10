import { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import Ajv from "ajv";
import schema from "../shared/types.schema.json";

const ajv = new Ajv();
const isValidBodyParams = ajv.compile(schema.definitions["MovieReview"] || {});
const ddbDocClient = createDDbDocClient();

const generateReviewId = (): number => Math.floor(Math.random() * 1000000);

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Methods": "OPTIONS, POST",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Origin": "*"
};

export const handler: APIGatewayProxyHandler = async (event): Promise<APIGatewayProxyResult> => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ message: "CORS preflight successful" }),
      };
    }

    console.log("Event: ", JSON.stringify(event));

    const movieId = event.pathParameters?.movieId;
    if (!movieId || isNaN(Number(movieId))) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Invalid movieId. It must be a valid number." }),
      };
    }

    const body = event.body ? JSON.parse(event.body) : undefined;
    if (!body || !isValidBodyParams(body)) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Invalid request body", schema: schema.definitions["MovieReview"] }),
      };
    }

    const { reviewerId, reviewDate, content } = body;
    const reviewId = generateReviewId();

    const tableName = process.env.TABLE_NAME;
    if (!tableName) {
      throw new Error("TABLE_NAME environment variable is not set");
    }

    const reviewData = { movieId: Number(movieId), reviewId, reviewerId, reviewDate, content };

    console.log("Writing to DynamoDB: ", JSON.stringify(reviewData));
    await ddbDocClient.send(new PutCommand({ TableName: tableName, Item: reviewData }));

    return {
      statusCode: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Review added successfully", reviewId }),
    };
  } catch (error: any) {
    console.error("Error adding review: ", error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  return DynamoDBDocumentClient.from(ddbClient, {
    marshallOptions: { convertEmptyValues: true, removeUndefinedValues: true },
    unmarshallOptions: { wrapNumbers: false },
  });
}
