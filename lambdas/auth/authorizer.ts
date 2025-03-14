import { APIGatewayRequestAuthorizerHandler } from "aws-lambda";
import { CookieMap, createPolicy, parseCookies, verifyToken } from "../../shared/util";

export const handler: APIGatewayRequestAuthorizerHandler = async (event) => {
  console.log("[EVENT]", JSON.stringify(event, null, 2)); // Log the event to help debug

  // Parse cookies from the event
  const cookies: CookieMap = parseCookies(event);

  // If no cookies are found, deny the request
  if (!cookies || !cookies.token) {
    console.error("No cookies or token found.");
    return {
      principalId: "",
      policyDocument: createPolicy(event, "Deny"),
    };
  }

  // Verify the JWT token
  const verifiedJwt = await verifyToken(
    cookies.token, // Extracted token from cookies
    process.env.USER_POOL_ID, // User pool ID from environment variable
    process.env.REGION! // AWS region from environment variable
  );

  // If the JWT token is valid, return an 'Allow' policy, otherwise 'Deny'
  return {
    principalId: verifiedJwt ? verifiedJwt.sub!.toString() : "", // Extract 'sub' from JWT
    policyDocument: createPolicy(event, verifiedJwt ? "Allow" : "Deny"),
  };
};
