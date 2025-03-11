import { APIGatewayProxyHandler, APIGatewayProxyEvent } from "aws-lambda";
import { DynamoDB } from "aws-sdk";
import { ReviewUpdatePayload } from "../shared/types";
import { verifyToken, parseCookies } from "../shared/util";
import Ajv from "ajv";
import schema from "../shared/types.schema.json";

const ajv = new Ajv();
const isValidReviewUpdatePayload = ajv.compile(schema.definitions["ReviewUpdatePayload"] || {});

const dynamodb = new DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || "MovieReviews"; // Ensure TABLE_NAME is set

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  const { movieId, reviewId } = event.pathParameters || {};
  if (!movieId || !reviewId || !event.body) {
    return { statusCode: 400, body: "Invalid request" };
  }
  const cookies = parseCookies(event);
  if (!cookies || !cookies.token) {
    return { statusCode: 401, body: "Unauthorized" };
  }
  const verifiedJwt = await verifyToken(
    cookies.token,
    process.env.USER_POOL_ID!,
    process.env.REGION!
  );
  if (!verifiedJwt) {
    return { statusCode: 401, body: "Invalid token" };
  }
  try {
    const updatePayload: ReviewUpdatePayload = JSON.parse(event.body);
    if (!isValidReviewUpdatePayload(updatePayload)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Invalid update payload format",
          errors: isValidReviewUpdatePayload.errors
        })
      };
    }
    const reviewerEmail = verifiedJwt.email;
    const getParams: DynamoDB.DocumentClient.GetItemInput = {
      TableName: TABLE_NAME,
      Key: { movieId: Number(movieId), reviewId: Number(reviewId) }
    };
    const existingReview = await dynamodb.get(getParams).promise();
    if (!existingReview.Item) {
      return { statusCode: 404, body: "Review not found" };
    }
    if (existingReview.Item.reviewerId !== reviewerEmail) {
      return { statusCode: 403, body: "Forbidden: You can only update your own reviews" };
    }
    const params: DynamoDB.DocumentClient.UpdateItemInput = {
      TableName: TABLE_NAME,
      Key: { movieId: Number(movieId), reviewId: Number(reviewId) },
      UpdateExpression: "set content = :content, reviewDate = :reviewDate",
      ExpressionAttributeValues: {
        ":content": updatePayload.content,
        ":reviewDate": updatePayload.reviewDate
      },
      ReturnValues: "ALL_NEW"
    };
    const result = await dynamodb.update(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify(result.Attributes)
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not update review" })
    };
  }
};