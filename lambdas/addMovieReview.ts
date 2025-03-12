import { APIGatewayProxyHandlerV2 } from 'aws-lambda';  // Import APIGatewayProxyHandlerV2
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import Ajv from 'ajv';  // Import AJV for schema validation
import schema from '../shared/types.schema.json';  // Import the schema JSON

// Initialize AJV instance and compile the schema
const ajv = new Ajv();
const isValidBodyParams = ajv.compile(schema.definitions["MovieReview"] || {});

// Create DynamoDB Document client
const ddbDocClient = createDDbDocClient();

// Function to generate a unique reviewId using movieId and Date.now()
const generateReviewId = (movieId: number): number => movieId * 1000000 + Date.now();

// The handler function for the addMovieReview endpoint
export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
    try {
        console.log("Event: ", event);

        // Parse the incoming event body
        const body = event.body ? JSON.parse(event.body) : undefined;

        if (!body) {
            return {
                statusCode: 400,
                headers: {
                    "content-type": "application/json",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Origin": "*",
                },
                body: JSON.stringify({ message: "Missing request body" }),
            };
        }

        // Validate the body against the schema
        if (!isValidBodyParams(body)) {
            return {
                statusCode: 400,
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

        // Extract fields from the body
        const { movieId, reviewerId, reviewDate, content } = body;

        // Ensure movieId is a valid number
        if (typeof movieId !== 'number' || isNaN(movieId)) {
            return {
                statusCode: 400,
                headers: {
                    "content-type": "application/json",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Origin": "*",
                },
                body: JSON.stringify({
                    message: "Invalid movieId. movieId must be a valid number."
                }),
            };
        }

        // Generate reviewId
        const reviewId = generateReviewId(movieId);

        // Prepare the review data to be inserted into DynamoDB
        const reviewData = {
            movieId: movieId,
            reviewId: reviewId,  // reviewId is now a number
            reviewerId: reviewerId,
            reviewDate: reviewDate,
            content: content
        };

        // Insert the new review into DynamoDB
        const commandOutput = await ddbDocClient.send(
            new PutCommand({
                TableName: process.env.TABLE_NAME,
                Item: reviewData
            })
        );

        return {
            statusCode: 201,
            headers: {
                "content-type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({ message: "Review added" }),
        };
    } catch (error: any) {
        console.log(JSON.stringify(error));

        return {
            statusCode: 500,
            headers: {
                "content-type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({ message: error.message }),
        };
    }
};

// Helper function to create a DynamoDB Document client
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
