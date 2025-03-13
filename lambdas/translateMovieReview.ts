import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";
import { APIGatewayProxyHandler } from "aws-lambda";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { createResponse } from "../shared/util";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const translateClient = new TranslateClient({ region: process.env.REGION });
const TABLE_NAME = process.env.TABLE_NAME!;
const GSI_REVIEWER_INDEX = process.env.GSI_REVIEWER_INDEX!;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // Validate input parameters
    if (!event.pathParameters?.movieId || !event.queryStringParameters?.reviewId || !event.queryStringParameters?.language) {
      return createResponse(400, { message: "Missing required parameters: movieId, reviewId, or language" });
    }

    const movieId = Number(event.pathParameters.movieId);
    const reviewId = Number(event.queryStringParameters.reviewId);
    const language = event.queryStringParameters.language ?? "";

    if (isNaN(movieId) || isNaN(reviewId) || !language) {
      return createResponse(400, { message: "Invalid movieId, reviewId, or language" });
    }

    // Fetch the review from DynamoDB
    const getItemCommand = new GetItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({ movieId, reviewId }),
    });
    const { Item } = await ddbClient.send(getItemCommand);

    if (!Item) {
      return createResponse(404, { message: "Review not found" });
    }

    const review = unmarshall(Item);

    // Check if translation already exists
    if (review.translations?.[language]) {
      // Return cached translation with headers
      const response = createResponse(200, { translation: review.translations[language] }, {
        "Cache-Control": "public, max-age=3600",  // Cache for 1 hour
        "ETag": `"${movieId}-${reviewId}-${language}"`,  // Unique ETag for validation
        "Last-Modified": review.translations[language].lastUpdated,  // Last updated time from the translation
      });
      return response;
    }

    // Perform translation
    const translateCommand = new TranslateTextCommand({
      Text: review.content,
      SourceLanguageCode: "en",
      TargetLanguageCode: language,
    });
    const translationResult = await translateClient.send(translateCommand);

    // Update the review with the translation
    review.translations = review.translations || {};
    review.translations[language] = {
      content: translationResult.TranslatedText,
      lastUpdated: new Date().toISOString(),
    };

    const updateItemCommand = new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({ movieId, reviewId }),
      UpdateExpression: "SET translations = :translations",
      ExpressionAttributeValues: marshall({ ":translations": review.translations }),
    });

    await ddbClient.send(updateItemCommand);

    // Return new translation with cache headers
    const response = createResponse(200, { translation: review.translations[language] }, {
      "Cache-Control": "public, max-age=3600",  // Cache for 1 hour
      "ETag": `"${movieId}-${reviewId}-${language}"`,  // Unique ETag for validation
      "Last-Modified": new Date().toISOString(),  // Last modified time for new translation
    });
    return response;
  } catch (error) {
    console.error("Error translating movie review:", error);
    return createResponse(500, { message: "Internal Server Error" });
  }
};
