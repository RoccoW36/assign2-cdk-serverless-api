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
