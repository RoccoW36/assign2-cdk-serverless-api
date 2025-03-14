import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { CookieMap, parseCookies, verifyToken, JwtToken } from "../shared/util";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import Ajv from "ajv";
import schema from "../shared/types.schema.json";

const ajv = new Ajv();
const isValidBodyParams = ajv.compile(schema.definitions["MovieReview"] || {});
const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async function (event: any) {
    console.log("[EVENT]", JSON.stringify(event));

    try {
        // Parse cookies to get the JWT token
        const cookies: CookieMap = parseCookies(event);
        if (!cookies) {
            return {
                statusCode: 401,
                headers: {
                    "content-type": "application/json",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Origin": "*",
                },
                body: JSON.stringify({ message: "Unauthorized: No token provided" }),
            };
        }

        // Verify the JWT token using the authorizer function
        const verifiedJwt: JwtToken = await verifyToken(
            cookies.token,
            process.env.USER_POOL_ID,
            process.env.REGION!
        );

        if (!verifiedJwt) {
            return {
                statusCode: 401, // Unauthorized
                headers: {
                    "content-type": "application/json",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Origin": "*",
                },
                body: JSON.stringify({ message: "Unauthorized: Invalid token" }),
            };
        }

        // Parse and validate the request body
        const body = event.body ? JSON.parse(event.body) : undefined;
        if (!body) {
            return {
                statusCode: 400, // Bad request
                headers: {
                    "content-type": "application/json",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Origin": "*",
                },
                body: JSON.stringify({ message: "Missing request body" }),
            };
        }

        // Validate body parameters against the MovieReview schema
        if (!isValidBodyParams(body)) {
            return {
                statusCode: 400, // Bad request
                headers: {
                    "content-type": "application/json",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Origin": "*",
                },
                body: JSON.stringify({
                    message: `Incorrect type. Must match MovieReview schema`,
                    schema: schema.definitions["MovieReview"],
                }),
            };
        }

        // Construct the review item to be inserted into DynamoDB
        const reviewItem = {
            ...body,
            reviewerId: verifiedJwt.sub!, // Ensure the reviewerId comes from the token's sub claim
            movieId: event.pathParameters?.movieId, // Retrieve movieId from URL parameters
            reviewId: Date.now(), // Use current timestamp as unique review ID
        };

        // Insert the review into DynamoDB
        await ddbDocClient.send(
            new PutCommand({
                TableName: process.env.TABLE_NAME!,
                Item: reviewItem,
            })
        );

        // Return success response
        return {
            statusCode: 201, // Created
            headers: {
                "content-type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({ message: "Review added" }),
        };
    } catch (error: any) {
        console.log("Error: ", error);

        // Return server error response in case of an exception
        return {
            statusCode: 500, // Internal Server Error
            headers: {
                "content-type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({ message: error.message }),
        };
    }
};

// Define createDDbDocClient function outside the handler
function createDDbDocClient() {
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
