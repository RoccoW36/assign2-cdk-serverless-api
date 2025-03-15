import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { CookieMap, parseCookies, verifyToken, JwtToken } from "../shared/util"; // Assuming your utility functions are here
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, UpdateCommandInput } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("Event: ", JSON.stringify(event));

    // Extract and verify authentication token from cookies
    const cookies: CookieMap = parseCookies(event);
    if (!cookies?.token) {
      return {
        statusCode: 401,
        headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Unauthorized request: Missing token" }),
      };
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
      return {
        statusCode: 403,
        headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Forbidden: Invalid token" }),
      };
    }

    console.log("Verified JWT: ", JSON.stringify(verifiedJwt));

    // Extract movieId and reviewId from path parameters
    const pathParameters = event.pathParameters;
    if (!pathParameters) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Invalid path parameters" }),
      };
    }

    const { movieId, reviewId } = pathParameters;
    if (!movieId || !reviewId) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Invalid movieId or reviewId" }),
      };
    }

    // Extract and validate request body
    const body = event.body ? JSON.parse(event.body) : undefined;
    if (!body || !body.content || !body.reviewerId) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Missing request body, content, or reviewerId" }),
      };
    }

    const { reviewerId, content, reviewDate } = body;

    // Fetch the existing review from DynamoDB to validate the reviewerId
    const getCommandInput = {
      TableName: process.env.TABLE_NAME!,
      Key: { movieId, reviewId },
    };

    const { Item } = await ddbDocClient.send(new GetCommand(getCommandInput));
    if (!Item) {
      return {
        statusCode: 404,
        headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Review not found" }),
      };
    }

    // Check if the reviewerId matches the one in the database
    if (Item.reviewerId !== reviewerId) {
      return {
        statusCode: 403,
        headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Forbidden: reviewerId mismatch" }),
      };
    }

    // Prepare the update command for DynamoDB
    const updateCommandInput: UpdateCommandInput = {
      TableName: process.env.TABLE_NAME!,
      Key: { movieId, reviewId },
      UpdateExpression: "set content = :c, reviewDate = :r",
      ExpressionAttributeValues: {
        ":c": content,
        ":r": reviewDate || null,
      },
    };

    // Update the review in DynamoDB
    console.log("Updating review in DynamoDB: ", JSON.stringify(updateCommandInput));
    await ddbDocClient.send(new UpdateCommand(updateCommandInput));

    return {
      statusCode: 200,
      headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Review updated successfully" }),
    };
  } catch (error: any) {
    console.error("Error updating review: ", error);
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
