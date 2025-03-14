import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import Ajv from "ajv";
import schema from "../shared/types.schema.json";
import { CookieMap, parseCookies, verifyToken } from "../shared/util";

const ajv = new Ajv();
const isValidBodyParams = ajv.compile(schema.definitions["MovieReview"] || {});
const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
    try {
        // Parse cookies to get the JWT token
        const cookies: CookieMap = parseCookies(event);

        // If no token is found in cookies, return Unauthorized response
        if (!cookies || !cookies.token) {
            return {
                statusCode: 401, // Unauthorized
                headers: {
                    "content-type": "application/json",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Origin": "*",
                },
                body: JSON.stringify({ message: "Unauthorized: No token provided" }),
            };
        }
        console.log("Received Headers:", event.headers);
        console.log("Extracted Cookie:", event.headers?.Cookie || event.headers?.cookie);
        
        // Verify the JWT token using the authorizer function
        const verifiedJwt = await verifyToken(
            cookies.token,
            process.env.USER_POOL_ID,
            process.env.REGION!
        );

        // If token is invalid or cannot be verified, return Unauthorized response
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

// Function to create the DynamoDB Document Client
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
