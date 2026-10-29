import { AppError } from './AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access', code: string = ErrorCodes.UNAUTHORIZED) {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden', code: string = ErrorCodes.FORBIDDEN) {
    super(message, 403, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code: string = ErrorCodes.NOT_FOUND) {
    super(message, 404, code);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', code: string = ErrorCodes.CONFLICT) {
    super(message, 409, code);
  }
}

export class LockedError extends AppError {
  constructor(message = 'Resource is locked', code: string = ErrorCodes.DEVICE_LIMIT_EXCEEDED) {
    super(message, 423, code);
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(
    message = 'Unprocessable entity',
    code: string = ErrorCodes.VALIDATION_ERROR,
    extra?: Record<string, any>
  ) {
    super(message, 422, code, undefined, true, extra);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests, please try again later', code: string = ErrorCodes.RATE_LIMIT_EXCEEDED, extra?: Record<string, any>) {
    super(message, 429, code, undefined, true, extra);
  }
}
