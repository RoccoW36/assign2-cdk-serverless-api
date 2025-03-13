// shared/util.ts
import { MovieReview } from "./types";
import { marshall } from "@aws-sdk/util-dynamodb";

type Entity = MovieReview;

export const generateBatch = (data: Entity[]) => {
  return data.map((e) => generateItem(e));
};

export const generateItem = (entity: Entity) => {
  return {
    PutRequest: {
      Item: marshall(entity, { convertClassInstanceToMap: true }),
    },
  };
};

/**
 * Standardized response for API Gateway
 * @param statusCode HTTP status code
 * @param body Response body
 * @param headers Optional HTTP headers
 */
export const createResponse = (
  statusCode: number,
  body: object,
  headers: { [key: string]: string } = {}
) => {
  return {
    statusCode,
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };
};
