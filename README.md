# Serverless Movie Review API

## Author Information
**Student Name:** Martin Walsh  
**Student Number:** 01318411  
**Student Email:** [01318411@mail.wit.ie](mailto:01318411@mail.wit.ie)

## Overview
This project is a secure, serverless Web API for managing movie reviews, built using AWS CDK (TypeScript) and deployed on AWS Lambda, API Gateway, DynamoDB, and Cognito. The API supports review posting, updating, retrieving, and translation, with authentication handled via Cognito and role-based authorization enforced through a custom Lambda authorizer.

## Features
✅ **Serverless Architecture** – Fully managed, auto-scaling backend using AWS Lambda and DynamoDB.  
✅ **Authentication & Authorization** – Cognito User Pool with JWT-based authentication, secured by a custom API Gateway Lambda Authorizer.  
✅ **Movie Review Management** – Users can post and update their reviews; only the original reviewer can edit a review.  
✅ **Amazon Translate Integration** – Supports translations with caching to reduce redundant API calls.  
✅ **Infrastructure as Code** – Provisioned using AWS CDK for reproducibility and easy deployment.  

---

## API Endpoints

### **Movie Reviews API (App API)**
| Method | Endpoint | Description |
|--------|---------|-------------|
| **GET** | `/movies/reviews/{movieId}` | Retrieves all reviews for a movie. Supports optional query parameters: <br> `reviewId={id}` → Fetch a specific review. <br> `reviewerId={email}` → Fetch all reviews by a specific reviewer. |
| **POST** | `/movies/reviews` | Adds a new movie review (requires authentication). |
| **PUT** | `/movies/{movieId}/reviews/{reviewId}` | Updates an existing review (only allowed by the original reviewer). |
| **GET** | `/reviews/{reviewId}/{movieId}/translation?language={code}` | Retrieves a translated version of a review. Translations are cached in DynamoDB to prevent duplicate requests. |

### **Authentication API (Auth API)**
| Method | Endpoint | Description |
|--------|---------|-------------|
| **POST** | `/auth/signup` | Registers a new user. |
| **POST** | `/auth/signin` | Authenticates a user and returns a JWT in an HttpOnly cookie. |
| **POST** | `/auth/confirm-signup` | Confirms user registration via a verification code. |
| **POST** | `/auth/signout` | Logs the user out by clearing the authentication cookie. |

---

## Authentication & Authorization
- Cognito User Pool is used for authentication.
- JWT tokens are stored in **HttpOnly cookies** for secure authentication handling.
- A **custom Lambda Authorizer** validates JWT tokens before granting access to protected endpoints.
- **Only authenticated users** can post and update reviews.

---

## Data Storage (DynamoDB)
The **MovieReviews Table** stores review data with the following schema:

| Attribute  | Type   | Description |
|------------|--------|-------------|
| `movieId`  | Number | Partition key (unique per movie). |
| `reviewId` | Number | Unique per review (auto-generated). |
| `reviewerId` | String | Email address of the reviewer. |
| `reviewDate` | String | Date the review was created (updatable). |
| `content` | String | Review text (updatable). |
| `translations` | Map | Cached translations to avoid duplicate API calls. |

---

## Deployment

### **1. Install dependencies**
```sh
npm install
