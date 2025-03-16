import { APIGatewayProxyHandler } from "aws-lambda";
import { CookieMap, parseCookies, verifyToken, JwtToken } from "../shared/util";
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
  UpdateCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";


const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    console.log("Received event: ", JSON.stringify(event));

    // Extract and verify authentication token from cookies
    const cookies: CookieMap = parseCookies(event);
    if (!cookies?.token) {
      return createErrorResponse(401, "Unauthorized: Missing token");
    }

    let verifiedJwt: JwtToken;
    try {
      verifiedJwt = await verifyToken(
        cookies.token,
        process.env.USER_POOL_ID!,
        process.env.REGION!
      );
    } catch (err) {
      console.error("JWT Verification failed: ", err);
      return createErrorResponse(403, "Forbidden: Invalid token");
    }

    console.log("Verified JWT: ", JSON.stringify(verifiedJwt));

    // Extract path parameters
    const pathParameters = event.pathParameters;
    if (!pathParameters?.movieId || !pathParameters?.reviewId) {
      return createErrorResponse(400, "Invalid path parameters: movieId and reviewId required");
    }

    const movieId = parseInt(pathParameters.movieId);
    const reviewId = parseInt(pathParameters.reviewId);
    if (isNaN(movieId) || isNaN(reviewId)) {
      return createErrorResponse(400, "movieId and reviewId must be numbers");
    }

    // Extract and validate request body
    if (!event.body) {
      return createErrorResponse(400, "Request body is missing");
    }

    const body = JSON.parse(event.body);
    const { content, reviewDate, reviewerId } = body;

    if (!content || !reviewerId) {
      return createErrorResponse(400, "Content and reviewerId are required");
    }

    // Fetch the existing review from DynamoDB
    const getCommandInput = {
      TableName: process.env.TABLE_NAME!,
      Key: { movieId, reviewId },
    };

    const { Item } = await ddbDocClient.send(new GetCommand(getCommandInput));

    if (!Item) {
      return createErrorResponse(404, "Review not found");
    }

    // Validate that the requester is the owner of the review
    if (Item.reviewerId !== reviewerId) {
      return createErrorResponse(403, "Forbidden: reviewerId mismatch");
    }

    // Prepare the update command for DynamoDB
    const updateExpression = "set content = :c, reviewDate = :r";
    const expressionAttributes = {
      ":c": content,
      ":r": reviewDate || Item.reviewDate,
    };

    const updateCommandInput: UpdateCommandInput = {
      TableName: process.env.TABLE_NAME!,
      Key: { movieId, reviewId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributes,
    };

    // Update the review in DynamoDB
    console.log("Updating review in DynamoDB: ", JSON.stringify(updateCommandInput));
    await ddbDocClient.send(new UpdateCommand(updateCommandInput));

    return createSuccessResponse({ message: "Review updated successfully" });
  } catch (error: any) {
    console.error("Error updating review: ", error);
    return createErrorResponse(500, "Internal Server Error", error.message);
  }
};

// Utility Functions
function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  return DynamoDBDocumentClient.from(ddbClient, {
    marshallOptions: { convertEmptyValues: true, removeUndefinedValues: true },
    unmarshallOptions: { wrapNumbers: false },
  });
}

function createErrorResponse(statusCode: number, message: string, error?: string) {
  return {
    statusCode,
    headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({ message, error }),
  };
}

function createSuccessResponse(body: any) {
  return {
    statusCode: 200,
    headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(body),
  };
}
