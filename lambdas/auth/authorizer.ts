import { APIGatewayRequestAuthorizerHandler } from "aws-lambda";
import { CookieMap, createPolicy, parseCookies, verifyToken } from "../../shared/util";

export const handler: APIGatewayRequestAuthorizerHandler = async (event) => {
  console.log("[EVENT]", event);
  
  const headers = event.headers
  
  if(!headers?.Authorization) {
  return {
  principalId: "",
  policyDocument: createPolicy(event, "Deny"),
  };
  }
  
  const verifiedJwt = await verifyToken(
  headers.Authorization,
  process.env.USER_POOL_ID,
  process.env.REGION!
  );
  
  return {
  principalId: verifiedJwt ? verifiedJwt.sub!.toString() : "",
  policyDocument: createPolicy(event, verifiedJwt ? "Allow" : "Deny"),
  };
  };
