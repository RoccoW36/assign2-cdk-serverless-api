import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

// Environment variables
const TABLE_NAME = process.env.TABLE_NAME!;
const REGION = process.env.REGION!;

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("Event: ", event);

    // Extract movieId and reviewId from path parameters
    const movieId = Number(event.pathParameters?.movieId);
    const reviewId = Number(event.pathParameters?.reviewId);

    if (isNaN(movieId) || isNaN(reviewId)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid movieId or reviewId. They must be valid numbers." }),
      };
    }

    // Parse the body of the request
    const { reviewerId, reviewDate, content } = JSON.parse(event.body || '{}');

    // Validate request body fields
    if (!reviewDate && !content) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "At least one field ('reviewDate' or 'content') must be provided to update." }),
      };
    }

    // Fetch the existing review from DynamoDB
    const review = await ddbDocClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { movieId: movieId, reviewId: reviewId },
      })
    );

    if (!review.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Review not found" }),
      };
    }

    // If reviewerId is provided in the body, check if it matches the one stored in the review
    if (reviewerId && review.Item.reviewerId !== reviewerId) {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: "You are not authorized to update this review" }),
      };
    }

    // Prepare update expression
    const updateExpression = [];
    const expressionAttributeValues: Record<string, any> = {};

    if (reviewDate) {
      updateExpression.push("reviewDate = :reviewDate");
      expressionAttributeValues[":reviewDate"] = reviewDate;
    }
    if (content) {
      updateExpression.push("content = :content");
      expressionAttributeValues[":content"] = content;
    }

    // Update the review in DynamoDB
    await ddbDocClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { movieId: movieId, reviewId: reviewId },
        UpdateExpression: `SET ${updateExpression.join(", ")}`,
        ExpressionAttributeValues: expressionAttributeValues,
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Review updated successfully" }),
    };
  } catch (error: any) {
    console.error("Error updating review: ", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error updating review", error: error.message }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: REGION });
  return DynamoDBDocumentClient.from(ddbClient, {
    marshallOptions: { convertEmptyValues: true, removeUndefinedValues: true },
    unmarshallOptions: { wrapNumbers: false },
  });
}
