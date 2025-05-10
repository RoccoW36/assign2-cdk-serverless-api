import { APIGatewayRequestAuthorizerHandler } from "aws-lambda";
import { CookieMap, createPolicy, parseCookies, verifyToken } from "../../shared/util";

export const handler: APIGatewayRequestAuthorizerHandler = async (event) => {
  console.log("[EVENT RECEIVED]", JSON.stringify(event, null, 2));

  const cookies: CookieMap = parseCookies(event);

  var token = cookies?.token

  if (!token) {
    const authHeader = event.headers?.Authorization
    token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined
  }

  if (!token) {
    console.warn("No authentication token found in cookies.");
    return {
      principalId: "unauthorised",
      policyDocument: createPolicy(event, "Deny"),
    };
  }

  if (!process.env.USER_POOL_ID || !process.env.REGION) {
    console.error("Missing required environment variables.");
    return {
      principalId: "unauthorised",
      policyDocument: createPolicy(event, "Deny"),
    };
  }

  let verifiedJwt;
  try {
    console.log("🔍 Verifying JWT...");
    verifiedJwt = await verifyToken(token, process.env.USER_POOL_ID, process.env.REGION!);
  } catch (err) {
    console.error("JWT verification failed:", err);
    return {
      principalId: "unauthorised",
      policyDocument: createPolicy(event, "Deny"),
    };
  }

  if (!verifiedJwt) {
    console.error("Token is invalid.");
    return {
      principalId: "unauthorised",
      policyDocument: createPolicy(event, "Deny"),
    };
  }

  console.log("[VERIFIED JWT]", JSON.stringify(verifiedJwt, null, 2));

  return {
    principalId: verifiedJwt.sub!,
    policyDocument: createPolicy(event, "Allow"),
    context: {
      userId: verifiedJwt.sub!,
      email: verifiedJwt.email!,
    },
  };
};
