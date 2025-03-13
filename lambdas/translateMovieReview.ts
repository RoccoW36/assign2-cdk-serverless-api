import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";
import { APIGatewayProxyHandler } from "aws-lambda";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { createResponse } from "../shared/util";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const translateClient = new TranslateClient({ region: process.env.REGION });
const TABLE_NAME = process.env.TABLE_NAME!;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // Validate input parameters
    const movieId = Number(event.pathParameters?.movieId);
    const reviewId = Number(event.pathParameters?.reviewId);

    const language = event.pathParameters?.language;

    if (isNaN(movieId) || isNaN(reviewId) || !language) {
      return createResponse(400, { message: "Invalid movieId, reviewId, or language" });
    }
    // Fetch the review from DynamoDB
    const getItemCommand = new GetItemCommand({
       TableName: TABLE_NAME,
      Key: marshall({ movieId, reviewId }),
    });
    const { Item } = await ddbClient.send(getItemCommand)

    if (!Item) {
      return createResponse(404, { message: "Review not found" });
    }

    const review = unmarshall(Item);
    // Check if translation already exists and is still valid (TTL check)
    const cachedTranslation = review.translations?.[language];
    if (cachedTranslation && cachedTranslation.ttl > Math.floor(Date.now() / 1000)) {
      // Return cached translation
      return createResponse(200, { translation: cachedTranslation.content });
    }

    // Perform translation if not found in cache or if TTL expired
    const translateCommand = new TranslateTextCommand({
      Text: review.content,
      SourceLanguageCode: "en",
      TargetLanguageCode: language,
    });
    const translationResult = await translateClient.send(translateCommand);
 
    // Add TTL
    const ttl = Math.floor(Date.now() / 1000) + 60; // 60 seconds
 
    // Update the review with the translation and TTL
    const translations = review.translations || {};
    translations[language] = {
      content: translationResult.TranslatedText,
      lastUpdated: new Date().toISOString(),
      ttl,
    };
    const updateItemCommand = new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({ movieId, reviewId }),
      UpdateExpression: "SET translations = :translations",
      ExpressionAttributeValues: marshall({ ":translations": translations }),
    });
    await ddbClient.send(updateItemCommand);

    // Return new translation
    return createResponse(200, { translation: translations[language].content });
  } catch (error) {
    console.error("Error translating movie review:", error);
    return createResponse(500, { message: "Internal Server Error" });
  }
};