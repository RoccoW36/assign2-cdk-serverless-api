import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, UpdateCommandInput } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    console.log("Event: ", event);

    // Parse request body
    const body = event.body ? JSON.parse(event.body) : undefined;
    const { content, reviewDate } = body;

    // Validate the input (ensure content is provided)
    if (!content) {
      return {
        statusCode: 400,
        headers: {
          "content-type": "application/json",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ message: "Content is required" }),
      };
    }

    // Extract path parameters
    const parameters = event?.pathParameters;
    const movieId = parameters?.movieId ? parseInt(parameters.movieId) : undefined;
    const reviewerId = parameters?.reviewerId;

    if (!movieId || !reviewerId) {
      return {
        statusCode: 400,
        headers: {
          "content-type": "application/json",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ message: "Missing path parameters" }),
      };
    }

    // Fetch the existing review to ensure reviewerId matches the stored review
    // This can be done with a GetItem or Query on DynamoDB (to be added)

    // Create update command input
    let updateExpression = "set content = :content";
    const expressionAttributes: { [key: string]: any } = {
      ":content": content,
    };

    if (reviewDate) {
      updateExpression += ", reviewDate = :reviewDate";
      expressionAttributes[":reviewDate"] = reviewDate;
    }

    const commandInput: UpdateCommandInput = {
      TableName: process.env.TABLE_NAME,
      Key: { movieId, reviewerId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributes,
    };

    const commandOutput = await ddbDocClient.send(new UpdateCommand(commandInput));

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ message: "Review updated successfully" }),
    };
  } catch (error: any) {
    console.error(error);
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ message: error.message }),
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
