import { APIGatewayProxyHandlerV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { SignInBody } from "../../shared/types";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  InitiateAuthCommandInput,
} from "@aws-sdk/client-cognito-identity-provider";
import Ajv from "ajv";
import schema from "../../shared/types.schema.json";

const ajv = new Ajv();
const isValidBodyParams = ajv.compile(schema.definitions["SignInBody"] || {});

const client = new CognitoIdentityProviderClient({
  region: process.env.REGION,
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS, POST",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Credentials": "true",
};

export const handler: APIGatewayProxyHandlerV2 = async (
  event
): Promise<APIGatewayProxyResultV2> => {
  try {
    if (event?.requestContext?.http?.method === "OPTIONS") {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ message: "CORS preflight successful" }),
      };
    }

    console.log("[EVENT]", JSON.stringify(event));

    const body = event.body ? JSON.parse(event.body) : undefined;

    if (!isValidBodyParams(body)) {
      console.log("[Invalid Body]", body);
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Incorrect type. Must match SignInBody schema",
          schema: schema.definitions["SignInBody"],
        }),
      };
    }

    const signInBody = body as SignInBody;

    const params: InitiateAuthCommandInput = {
      ClientId: process.env.CLIENT_ID!,
      AuthFlow: "USER_PASSWORD_AUTH",
      AuthParameters: {
        USERNAME: signInBody.username,
        PASSWORD: signInBody.password,
      },
    };

    const command = new InitiateAuthCommand(params);
    const { AuthenticationResult } = await client.send(command);

    console.log("Auth Result:", AuthenticationResult);

    if (!AuthenticationResult || !AuthenticationResult.IdToken) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ message: "User signin failed" }),
      };
    }

    const token = AuthenticationResult.IdToken;

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Set-Cookie": `token=${token}; Path=/; Secure; HttpOnly; SameSite=None; Max-Age=3600`,

      },
      body: JSON.stringify({
        message: "Auth successful",
        token: token,
      }),
    };
  } catch (err) {
    console.error("[ERROR]", err);

    const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";

    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ message: errorMessage }),
    };
  }
};
