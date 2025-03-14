export type MovieReview = {
  movieId: number;
  reviewId: number;
  reviewerId: string;
  reviewDate: string;
  content: string;
  translations?: {
    [language: string]: {
      content: string;
      lastUpdated: string;
    };
  };
};

export type MovieReviewQueryParams = {
  reviewId?: number;
  reviewerId?: string;
};

export type TranslationRequest = {
  movieId: number;
  reviewId: number;
  language: string;
};

export type TranslatedReview = {
  movieId: number;
  reviewId: number;
  reviewerId: string;
  reviewDate: string;
  content: string;
  translations?: {
    [language: string]: {
      content: string;
      lastUpdated: string;
    };
  };
  // Optional cache fields
  cache?: {
    ETag?: string;
    LastModified?: string;
  };
};

export type ReviewUpdatePayload = {
  reviewerId: string;
  reviewDate: string;
  content: string;
};

// --- Authentication Types ---
export type AuthApiProps = {
  userPoolId: string;
  userPoolClientId: string;
};

export type SignUpBody = {
  username: string;
  password: string;
  email: string;
};

export type ConfirmSignUpBody = {
  username: string;
  code: string;
};

export type SignInBody = {
  username: string;
  password: string;
};

export type AuthResponse = {
  message: string;
  token?: string; // JWT token (only for successful sign-in)
  refreshToken?: string; // Refresh token if needed
};
