import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

// Environment variables
const TABLE_NAME = process.env.TABLE_NAME!;
const REGION = process.env.REGION!;

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("Event: ", event);

    const { movieId, reviewId, reviewerId, reviewDate, content } = JSON.parse(event.body || '{}');

    // Validate input parameters
    if (typeof movieId !== "number" || isNaN(movieId)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid movieId. It must be a valid number." }),
      };
    }

    if (typeof reviewId !== "number" || isNaN(reviewId)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid reviewId. It must be a valid number." }),
      };
    }

    const updateExpression = [];
    const expressionAttributeValues: Record<string, any> = {};
    
    // Conditionally add attributes to update
    if (reviewerId) {
      updateExpression.push("reviewerId = :reviewerId");
      expressionAttributeValues[":reviewerId"] = reviewerId;
    }
    if (reviewDate) {
      updateExpression.push("reviewDate = :reviewDate");
      expressionAttributeValues[":reviewDate"] = reviewDate;
    }
    if (content) {
      updateExpression.push("content = :content");
      expressionAttributeValues[":content"] = content;
    }

    // If no fields are provided to update
    if (updateExpression.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "At least one field must be provided to update" }),
      };
    }

    // Update the review in DynamoDB
    await ddbDocClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { movieId, reviewId },
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
