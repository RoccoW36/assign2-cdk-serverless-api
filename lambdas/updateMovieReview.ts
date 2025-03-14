import { APIGatewayProxyEvent } from 'aws-lambda';
import { CookieMap, parseCookies, verifyToken } from "../shared/util"; // Importing from utils
import { ddbDocClient } from "../shared/util";
import { UpdateItemCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";

// Helper function to create standardized responses
function createResponse(statusCode: number, body: object) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(body),
  };
}

export const updateMovieReview = async (event: APIGatewayProxyEvent) => {
  try {
    // 1. Parse cookies to get the JWT token
    const cookies: CookieMap = parseCookies(event);
    if (!cookies || !cookies.token) {
      console.log("No token found in cookies");
      return createResponse(401, { message: "Unauthorized: No token provided" });
    }

    // 2. Verify the JWT token using the authorizer function
    const verifiedJwt = await verifyToken(
      cookies.token,
      process.env.USER_POOL_ID,
      process.env.REGION!
    );

    if (!verifiedJwt) {
      console.log("Token verification failed");
      return createResponse(401, { message: "Unauthorized: Invalid token" });
    }

    // 3. Fetch the review to check if the reviewer is the same
    const reviewId = event.pathParameters?.reviewId;
    const movieId = event.pathParameters?.movieId;

    if (!reviewId || !movieId) {
      return createResponse(400, { message: "Bad Request: Missing review or movie ID" });
    }

    // Fetch review from DynamoDB
    const review = await getMovieReview(movieId, reviewId);
    if (review.ReviewerId.S !== verifiedJwt.sub) {
      return createResponse(403, { message: "Forbidden: You cannot update this review" });
    }

    // 4. Update the review content
    const body = event.body ? JSON.parse(event.body) : undefined;
    if (!body || !body.content) {
      return createResponse(400, { message: "Bad Request: Missing content field" });
    }

    const updateParams = {
      TableName: "MovieReviews",
      Key: {
        MovieId: { S: movieId },
        ReviewId: { S: reviewId },
      },
      UpdateExpression: "set Content = :content",
      ExpressionAttributeValues: {
        ":content": { S: body.content },
      },
      ReturnValues: "UPDATED_NEW" as const,
    };

    // Step 5: Execute the update
    const result = await ddbDocClient.send(new UpdateItemCommand(updateParams));
    if (!result.Attributes) {
      return createResponse(500, { message: "Failed to fetch updated attributes" });
    }

    return createResponse(200, { message: "Review updated successfully", updatedAttributes: result.Attributes });
  } catch (err) {
    console.error("Error updating review:", err);
    return createResponse(500, { message: "Internal Server Error" });
  }
};

// Helper function to fetch a movie review from DynamoDB
async function getMovieReview(movieId: string, reviewId: string) {
  const params = {
    TableName: "MovieReviews",
    Key: {
      MovieId: { S: movieId },
      ReviewId: { S: reviewId },
    },
  };

  try {
    const result = await ddbDocClient.send(new GetItemCommand(params));
    if (!result.Item) {
      throw new Error("Review not found");
    }
    return result.Item;
  } catch (err) {
    console.error("Error fetching review:", err);
    throw err;
  }
}
