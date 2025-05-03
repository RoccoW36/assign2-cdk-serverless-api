import { APIGatewayRequestAuthorizerHandler } from "aws-lambda";
import { CookieMap, createPolicy, parseCookies, verifyToken } from "../../shared/util";

export const handler: APIGatewayRequestAuthorizerHandler = async (event) => {
  console.log("[EVENT RECEIVED]", JSON.stringify(event, null, 2));

  const cookies: CookieMap = parseCookies(event);
  const authHeader = event.headers?.Authorization || event.headers?.authorization;

  console.log("[HEADERS RECEIVED]", JSON.stringify(event.headers, null, 2));
  console.log("[COOKIES RECEIVED]", JSON.stringify(cookies, null, 2));

  // Extract token: Try cookie first, then Authorization header
  const token = cookies?.token || (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);
  console.log("[EXTRACTED TOKEN]", token);

  if (!token) {
    console.error("No token found in cookies or Authorization header.");
    return {
      principalId: "unauthorized",
      policyDocument: createPolicy(event, "Deny"),
    };
  }

  try {
    const verifiedJwt = await verifyToken(token, process.env.USER_POOL_ID!, process.env.REGION!);

    if (!verifiedJwt) {
      console.error("JWT verification failed: Token is invalid.");
      return {
        principalId: "unauthorized",
        policyDocument: createPolicy(event, "Deny"),
      };
    }

    console.log("[VERIFIED JWT]", JSON.stringify(verifiedJwt, null, 2));

    return {
      principalId: verifiedJwt.sub!,
      policyDocument: createPolicy(event, "Allow"),
    };
  } catch (err) {
    console.error("JWT Verification failed:", err);
    return {
      principalId: "unauthorized",
      policyDocument: createPolicy(event, "Deny"),
    };
  }
};
