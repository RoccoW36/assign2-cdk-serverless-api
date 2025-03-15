import { MovieReview } from "./types";
import { marshall } from "@aws-sdk/util-dynamodb";
import {
  APIGatewayRequestAuthorizerEvent,
  APIGatewayAuthorizerEvent,
  PolicyDocument,
  APIGatewayProxyEvent,
  StatementEffect,
} from "aws-lambda";


import axios from "axios";
import jwt, { JwtPayload } from "jsonwebtoken";
import jwkToPem from "jwk-to-pem";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

type Entity = MovieReview;

export const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'eu-west-1' }));

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

export type CookieMap = { [key: string]: string } | undefined;
export type JwtToken = { sub: string; email: string } | null;
export type Jwk = {
  keys: {
    alg: string;
    e: string;
    kid: string;
    kty: "RSA";
    n: string;
    use: string;
  }[]; 
};

// Parse cookies from the event headers
export const parseCookies = (
  event: APIGatewayRequestAuthorizerEvent | APIGatewayProxyEvent
): CookieMap => {
  // Ensure the event has headers and the 'Cookie' field
  if (!event.headers || !event.headers.Cookie) {
    return undefined;
  }

  const cookiesStr = event.headers.Cookie; // Access cookies from the headers
  const cookiesArr = cookiesStr.split(";"); // Split cookies by ';'

  const cookieMap: CookieMap = {};

  // Loop through each cookie and split it into key-value pairs
  for (let cookie of cookiesArr) {
    const cookieSplit = cookie.trim().split("=");
    cookieMap[cookieSplit[0]] = cookieSplit[1];
  }

  return cookieMap;
};


// Verify the JWT token using a public key from Cognito
export const verifyToken = async (
  token: string,
  userPoolId: string | undefined,
  region: string
): Promise<JwtToken> => {
  try {
    if (!userPoolId) {
      throw new Error("User pool ID is undefined.");
    }

    // Fetch the JWK (JSON Web Key) set from Cognito
    const url = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
    const { data }: { data: Jwk } = await axios.get(url);

    // Find the RSA key in the JWK set
    const rsaKey = data.keys.find((key) => key.kty === "RSA");
    if (!rsaKey) {
      throw new Error("No RSA key found in the JWK.");
    }

    // Convert the JWK to PEM format
    const pem = jwkToPem(rsaKey);

    // Decode and verify the JWT token using the public key (PEM format)
    const decoded = jwt.verify(token, pem, { algorithms: ["RS256"] });

    // Ensure the decoded token contains 'sub' and 'email'
    if (typeof decoded === "object" && decoded !== null && "sub" in decoded && "email" in decoded) {
      return decoded as JwtToken;
    }

    return null; // Return null if token is not valid
  } catch (err) {
    console.error("Token verification failed:", err);
    return null;
  }
};

// Create an IAM policy for API Gateway authorizer
export const createPolicy = (
  event: APIGatewayAuthorizerEvent,
  effect: StatementEffect
): PolicyDocument => {
  return {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: effect,
        Action: "execute-api:Invoke",
        Resource: [event.methodArn],
      },
    ],
  };
};
