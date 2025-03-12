import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDB, Translate } from "aws-sdk";
import { TranslatedReview } from "../shared/types";
import Ajv from "ajv";
import schema from "../shared/types.schema.json";

const ajv = new Ajv();
const isValidTranslationRequest = ajv.compile(schema.definitions["TranslationRequest"] || {});
const dynamodb = new DynamoDB.DocumentClient();
const translate = new Translate();
const TABLE_NAME = process.env.TABLE_NAME || "MovieReviews";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  // Extract parameters from the path and query string
  const movieId = event.pathParameters?.movieId;
  const queryStringParams = event.queryStringParameters;

  // Ensure queryStringParameters is not undefined and contains necessary fields
  if (!queryStringParams || !queryStringParams.reviewId || !queryStringParams.language) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Missing required parameters: reviewId or language"
      })
    };
  }

  const { reviewId, language } = queryStringParams;

  // Validate the parameters
  if (!movieId || !reviewId || !language) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Missing required parameters: movieId, reviewId, or language"
      })
    };
  }

  // Proceed with getting the review from DynamoDB
  const getParams: DynamoDB.DocumentClient.GetItemInput = {
    TableName: TABLE_NAME,
    Key: { movieId: Number(movieId), reviewId: Number(reviewId) }
  };

  try {
    const result = await dynamodb.get(getParams).promise();
    if (!result.Item) {
      return { statusCode: 404, body: "Review not found" };
    }

    let review = result.Item as TranslatedReview;
    review.translations = review.translations || {};

    // If the translation already exists and is up-to-date, return it
    if (review.translations[language] && review.translations[language].lastUpdated === review.reviewDate) {
      return { statusCode: 200, body: JSON.stringify(review.translations[language]) };
    }

    // Proceed to translate the review content
    const translateParams = {
      Text: review.content,
      SourceLanguageCode: "en",
      TargetLanguageCode: language
    };

    const translationResult = await translate.translateText(translateParams).promise();
    review.translations[language] = {
      content: translationResult.TranslatedText,
      lastUpdated: review.reviewDate
    };

    // Save the updated review with the new translation
    const putParams: DynamoDB.DocumentClient.PutItemInput = {
      TableName: TABLE_NAME,
      Item: review
    };
    await dynamodb.put(putParams).promise();

    return {
      statusCode: 201, // Indicating that a new translation was created
      body: JSON.stringify(review.translations[language])
    };
  } catch (error) {
    console.error("Error translating movie review:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not translate review" })
    };
  }
};
