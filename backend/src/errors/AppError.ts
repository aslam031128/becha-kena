import { ErrorCode, ErrorCodes } from '../constants/errorCodes.js';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode | string;
  public readonly isOperational: boolean;
  public readonly details?: Array<{ field?: string; message: string }>;
  public readonly extra?: Record<string, any>;

  constructor(
    message: string,
    statusCode = 500,
    code: ErrorCode | string = ErrorCodes.INTERNAL_SERVER_ERROR,
    details?: Array<{ field?: string; message: string }>,
    isOperational = true,
    extra?: Record<string, any>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    this.extra = extra;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
