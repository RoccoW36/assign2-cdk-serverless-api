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
};

export type ReviewUpdatePayload = {
  movieId: number;
  reviewId: number;
  reviewDate?: string;
  content: string;
};

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

export type AppApiProps = {
  userPoolId: string;
  userPoolClientId: string;
};

