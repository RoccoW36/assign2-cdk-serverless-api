import { APIGatewayProxyHandlerV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import Ajv from "ajv";
import schema from "../shared/types.schema.json";
import { MovieReview } from "../shared/types";
import { generateReviewId } from "../shared/util";
import * as jwt from "jsonwebtoken";  // Added JWT package for token verification

const ajv = new Ajv();
const isValidMovieReview = ajv.compile(schema.definitions["MovieReview"] || {});
const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event): Promise<APIGatewayProxyResultV2> => {
  console.log("AddMovieReview lambda function started");
  console.log("Event:", JSON.stringify(event, null, 2));

  try {
    // Extract JWT token from the Cookie header
    const cookies = event.headers.Cookie || '';
    const token = cookies.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
    
    if (!token) {
      console.log("Error: Token not found in cookies");
      return createResponse(401, { message: "Unauthorized - Token not found" });
    }

    // Verify the JWT token
    try {
      const decoded = jwt.verify(token, 'your-secret-key'); // Replace 'your-secret-key' with your actual JWT secret or public key
      console.log("Decoded JWT:", decoded);
    } catch (err) {
      console.error("Error: Invalid token", err);
      return createResponse(401, { message: "Unauthorized - Invalid token" });
    }

    if (!event.body) {
      console.log("Error: Missing request body");
      return createResponse(400, { message: "Missing request body" });
    }
    
    const reviewInput = JSON.parse(event.body) as Partial<MovieReview>;
    console.log("Received review input:", JSON.stringify(reviewInput, null, 2));

    delete reviewInput.reviewId;  // Ensure no reviewId is passed in the input

    if (!isValidMovieReview(reviewInput)) {
      console.log("Error: Invalid review format");
      console.log("Validation errors:", JSON.stringify(isValidMovieReview.errors, null, 2));
      return createResponse(400, {
        message: "Invalid review format",
        errors: isValidMovieReview.errors,
        schema: schema.definitions["MovieReview"],
      });
    }

    const reviewId = generateReviewId();
    console.log("Generated reviewId:", reviewId);

    // Ensure reviewId is a number
    if (typeof reviewId !== 'number') {
      return createResponse(400, { message: "Invalid reviewId generated" });
    }

    const review: MovieReview = {
      ...reviewInput as Omit<MovieReview, 'reviewId'>,
      reviewId: reviewId,
    };
    console.log("Prepared review object:", JSON.stringify(review, null, 2));

    console.log("Attempting to save review to DynamoDB");
    await ddbDocClient.send(
      new PutCommand({
        TableName: process.env.TABLE_NAME,
        Item: review,
      })
    );
    console.log("Review successfully saved to DynamoDB");

    return createResponse(201, { message: "Review added", reviewId: reviewId, review: review });
  } catch (error: any) {
    console.error("Error in AddMovieReview lambda:", error);
    return createResponse(500, { message: "Could not add review", error: error.message });
  }
};

function createDDbDocClient() {
  console.log("Creating DynamoDB Document Client");
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

function createResponse(statusCode: number, body: any): APIGatewayProxyResultV2 {
  console.log(`Creating response with status code ${statusCode} and body:`, JSON.stringify(body, null, 2));
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(body),
  };
}
