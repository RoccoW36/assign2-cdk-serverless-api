import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDB, Translate } from "aws-sdk";
import { TranslationRequest, TranslatedReview } from "../shared/types";
import Ajv from "ajv";
import schema from "../shared/types.schema.json";

const ajv = new Ajv();

const isValidTranslationRequest = ajv.compile(schema.definitions["TranslationRequest"] || {});
const dynamodb = new DynamoDB.DocumentClient();
const translate = new Translate();
const TABLE_NAME = process.env.TABLE_NAME || "MovieReviews";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const translationRequest = event.queryStringParameters as unknown as TranslationRequest;
  if (!isValidTranslationRequest(translationRequest)) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Invalid translation request format",
        errors: isValidTranslationRequest.errors
      })
    };
  }

  const { movieId, reviewId, language } = translationRequest;
  const getParams: DynamoDB.DocumentClient.GetItemInput = {
    TableName: TABLE_NAME,
    Key: { movieId: Number(movieId), reviewId: Number(reviewId) }
  };
  try {
    const result = await dynamodb.get(getParams).promise();
    if (!result.Item) {
      return { statusCode: 404, body: "Review not found" };
    }
    const review = result.Item as TranslatedReview;
    if (review.translations && review.translations[language] &&
      review.translations[language].lastUpdated === review.reviewDate) {
      return { statusCode: 200, body: JSON.stringify(review.translations[language]) };
    }

    const translateParams = {
      Text: review.content,
      SourceLanguageCode: "en",
      TargetLanguageCode: language
    };

    const translationResult = await translate.translateText(translateParams).promise();
    if (!review.translations) review.translations = {};
    review.translations[language] = {
      content: translationResult.TranslatedText,
      lastUpdated: review.reviewDate
    };

    const putParams: DynamoDB.DocumentClient.PutItemInput = {
      TableName: TABLE_NAME,
      Item: review
    };
    await dynamodb.put(putParams).promise();
    return {
      statusCode: 200,
      body: JSON.stringify(review)
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not translate review" })
    };
  }
};