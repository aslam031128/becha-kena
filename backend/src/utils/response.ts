import { Response } from 'express';

export interface PaginationMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

export interface SuccessEnvelope<T> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface ErrorDetail {
  field?: string;
  message: string;
  [key: string]: unknown;
}

export interface ErrorEnvelope {
  success: false;
  statusCode: number;
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
  };
  timestamp: string;
  path?: string;
}

/**
 * Sends a standardized success JSON response.
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  message = 'Operation successful',
  meta?: PaginationMeta
): Response => {
  const envelope: SuccessEnvelope<T> = {
    success: true,
    statusCode,
    message,
    data,
    ...(meta && { meta })
  };
  return res.status(statusCode).json(envelope);
};

export const sendError = (
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: ErrorDetail[],
  path?: string,
  extra?: Record<string, any>
): Response => {
  const envelope: any = {
    success: false,
    statusCode,
    error: {
      code,
      message,
      ...(details && details.length > 0 && { details }),
      ...(extra && extra)
    },
    timestamp: new Date().toISOString(),
    ...(path && { path })
  };
  return res.status(statusCode).json(envelope);
};
