Student Name: Martin Walsh
Student Number: 01318411
Student Email: 01318411@mail.wit.ie

Serverless Movie Review API
This project is a secure, serverless Web API for managing movie reviews, built using AWS CDK (TypeScript) and deployed on AWS Lambda, API Gateway, DynamoDB, and Cognito. The API supports review posting, updating, retrieving, and translation, with authentication handled via Cognito and role-based authorization enforced through a custom Lambda authorizer.

Features
✅ Serverless Architecture – Fully managed, auto-scaling backend using AWS Lambda and DynamoDB.
✅ Authentication & Authorization – Cognito User Pool with JWT-based authentication, secured by a custom API Gateway Lambda Authorizer.
✅ Movie Review Management – Users can post and update their reviews; only the original reviewer can edit a review.
✅ Amazon Translate Integration – Supports translations with caching to reduce redundant API calls.
✅ Infrastructure as Code – Provisioned using AWS CDK for reproducibility and easy deployment.

API Endpoints
Movie Reviews API (App API)
GET /movies/reviews/{movieId} – Retrieves all reviews for a movie. Supports optional query parameters:
reviewId={id} → Fetch a specific review.
reviewerId={email} → Fetch all reviews by a specific reviewer.
POST /movies/reviews – Adds a new movie review (requires authentication).
PUT /movies/{movieId}/reviews/{reviewId} – Updates an existing review (only allowed by the original reviewer).
GET /reviews/{reviewId}/{movieId}/translation?language={code} – Retrieves a translated version of a review.
Translations are cached in DynamoDB to prevent duplicate requests.
Authentication API (Auth API)
POST /auth/signup – Registers a new user.
POST /auth/signin – Authenticates a user and returns a JWT in an HttpOnly cookie.
POST /auth/confirm-signup – Confirms user registration via a verification code.
POST /auth/signout – Logs the user out by clearing the authentication cookie.
Authentication & Authorization
Cognito User Pool is used for authentication.
JWT tokens are stored in HttpOnly cookies for secure authentication handling.
Custom Lambda Authorizer validates JWT tokens before granting access to protected endpoints.
Only authenticated users can post and update reviews.
Data Storage (DynamoDB)
MovieReviews Table
Attribute	Type	Description
MovieId	Number	Partition key (unique per movie).
ReviewId	Number	Unique per review (auto-generated).
ReviewerId	String	Email address of the reviewer.
ReviewDate	String	Date the review was created (updatable).
Content	String	Review text (updatable).
Translations	Map	Cached translations to avoid duplicate API calls.
Deployment
Install dependencies:
sh
Copy
Edit
npm install
Bootstrap CDK (if not done before):
sh
Copy
Edit
npx cdk bootstrap
Deploy the stack:
sh
Copy
Edit
npx cdk deploy
Notes
The API is serverless and event-driven, scaling automatically based on demand.
Translations are stored in DynamoDB to minimize Amazon Translate API calls.
API security is enforced via Cognito and a custom Lambda authorizer.


