export interface ApiSuccessResponse<T> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  [key: string]: unknown;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
  timestamp: string;
  path: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

