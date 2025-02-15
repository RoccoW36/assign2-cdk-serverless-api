import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDocumentClient();
export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    console.log("[EVENT]", JSON.stringify(event))
    const movieId = event.pathParameters?.movieId;
    console.log("[movieId]", movieId);
    const includeCast = event.queryStringParameters?.cast === 'true';
    console.log("[includeCast]", includeCast);
    if (!movieId) {
      console.log("[ERROR] Missing movieId parameter");
      return {
        statusCode: 400,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "Missing movieId parameter" }),
      };
    }

    console.log("[Fetching movie data] MovieId:", movieId);
    // Get movie metadata
    const movieData = await ddbDocClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: { movieId: parseInt(movieId) },
      })
    );
    console.log("[Movie data result]", JSON.stringify(movieData));
    if (!movieData.Item) {
      console.log("[ERROR] Movie not found");
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "Movie not found" }),
      };
    }
    let response = { ...movieData.Item };

    // If cast information is requested, fetch it
    if (includeCast) {
      console.log("[Fetching cast data] MovieId:", movieId);
      const castData = await ddbDocClient.send(
        new QueryCommand({
          TableName: process.env.MOVIE_CASTS_TABLE_NAME,
          KeyConditionExpression: "movieId = :m",
         ExpressionAttributeValues: {
            ":m": parseInt(movieId),
          },
        })
      );
      console.log("[Cast data result]", JSON.stringify(castData));
      response.cast = castData.Items;
    }
    console.log("[Final response]", JSON.stringify(response));
    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(response),
    };
  } catch (error: any) {
    console.log("[ERROR]", JSON.stringify(error));
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error: error.message }),
    };
  }
};

function createDocumentClient() {
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