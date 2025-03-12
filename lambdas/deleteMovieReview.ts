import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import Ajv from "ajv";
import schema from "../shared/types.schema.json";

const ajv = new Ajv();
const isValidBodyParams = ajv.compile(schema.definitions["MovieReview"] || {});
const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
    try {
      console.log("[EVENT]", JSON.stringify(event));

      const movieId = event.pathParameters?.movieId;
      const reviewId = event.pathParameters?.reviewId;

      if (!movieId || !reviewId) {
        return {
          statusCode: 400,
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ message: "Missing movieId or reviewId" }),
        };
      }

      // Delete the review from the DynamoDB table
      const commandOutput = await ddbDocClient.send(
        new DeleteCommand({
          TableName: process.env.TABLE_NAME,
          Key: {
            movieId: parseInt(movieId, 10),  // Partition key: movieId
            reviewId: parseInt(reviewId, 10),  // Sort key: reviewId
          },
        })
      );

      return {
        statusCode: 200,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "Review deleted successfully" }),
      };
    } catch (error: any) {
      console.log("Error: ", JSON.stringify(error));
      return {
        statusCode: 500,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ error: error.message }),
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
