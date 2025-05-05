import { APIGatewayProxyHandler } from "aws-lambda";
import { verifyToken, JwtToken } from "../shared/util";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import Ajv from "ajv";
import schema from "../shared/types.schema.json";

const ajv = new Ajv();
const isValidBodyParams = ajv.compile(schema.definitions["MovieReview"] || {});
const ddbDocClient = createDDbDocClient();

const generateReviewId = (): number => Math.floor(Math.random() * 1000000);

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    console.log("Event: ", JSON.stringify(event));

    // Extract token from Authorization header
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return {
        statusCode: 401,
        headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Unauthorized request: Missing token" }),
      };
    }

    // Verify token
    let verifiedJwt: JwtToken;
    try {
      verifiedJwt = await verifyToken(token, process.env.USER_POOL_ID!, process.env.REGION!);
    } catch (err) {
      console.error("JWT Verification failed: ", err);
      return {
        statusCode: 403,
        headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Forbidden: Invalid token" }),
      };
    }

    console.log("Verified JWT: ", JSON.stringify(verifiedJwt));

    // Extract movieId from path parameters
    const movieId = event.pathParameters?.movieId;
    if (!movieId || isNaN(Number(movieId))) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Invalid movieId. It must be a valid number." }),
      };
    }

    // Parse and validate request body
    const body = event.body ? JSON.parse(event.body) : undefined;
    if (!body || !isValidBodyParams(body)) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Invalid request body", schema: schema.definitions["MovieReview"] }),
      };
    }

    const { reviewerId, reviewDate, content } = body;

    // Generate a unique reviewId
    const reviewId = generateReviewId();

    // Validate environment variables
    const tableName = process.env.TABLE_NAME;
    if (!tableName) {
      throw new Error("TABLE_NAME environment variable is not set");
    }

    // Prepare review data
    const reviewData = { 
      movieId: Number(movieId), 
      reviewId, 
      reviewerId, 
      reviewDate, 
      content 
    };

    console.log("Writing to DynamoDB: ", JSON.stringify(reviewData));

    await ddbDocClient.send(new PutCommand({ TableName: tableName, Item: reviewData }));

    return {
      statusCode: 201,
      headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Review added successfully", reviewId }),
    };
  } catch (error: any) {
    console.error("Error adding review: ", error);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
    };
  }
};

// Create a DynamoDB Document Client
function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  return DynamoDBDocumentClient.from(ddbClient, {
    marshallOptions: { convertEmptyValues: true, removeUndefinedValues: true },
    unmarshallOptions: { wrapNumbers: false },
  });
}
