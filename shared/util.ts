import { MovieReview } from "./types";
import { marshall } from "@aws-sdk/util-dynamodb";

type Entity = MovieReview;

export const generateBatch = (data: Entity[]) => {
  return data.map((e) => {
    return generateItem(e);
  });
};

export const generateItem = (entity: Entity) => {
  return {
    PutRequest: {
      Item: marshall(entity),
    },
  };
};