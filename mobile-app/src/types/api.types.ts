export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ApiError {
  success: false;
  statusCode: number;
  error: {
    code: string;
    message: string;
    details?: FieldError[];
  };
  timestamp?: string;
  path?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}
