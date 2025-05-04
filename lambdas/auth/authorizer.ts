import { APIGatewayRequestAuthorizerHandler } from "aws-lambda";
import { CookieMap, createPolicy, parseCookies, verifyToken } from "../../shared/util";

export const handler: APIGatewayRequestAuthorizerHandler = async (event) => {
  console.log("[EVENT RECEIVED]", JSON.stringify(event, null, 2));

  // Parse cookies
  const cookies: CookieMap = parseCookies(event);

  if (!cookies || !cookies.token) {
    console.warn("⚠️ No authentication token found in cookies.");
    return {
      principalId: "unauthorised",
      policyDocument: createPolicy(event, "Deny"),
    };
  }

  // Validate environment variables
  if (!process.env.USER_POOL_ID || !process.env.REGION) {
    console.error("❌ Missing required environment variables.");
    return {
      principalId: "unauthorised",
      policyDocument: createPolicy(event, "Deny"),
    };
  }

  let verifiedJwt;
  try {
    console.log("🔍 Verifying JWT...");
    verifiedJwt = await verifyToken(cookies.token, process.env.USER_POOL_ID, process.env.REGION!);
  } catch (err) {
    console.error("❌ JWT verification failed:", err);
    return {
      principalId: "unauthorised",
      policyDocument: createPolicy(event, "Deny"),
    };
  }

  if (!verifiedJwt) {
    console.error("⛔ Token is invalid.");
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
