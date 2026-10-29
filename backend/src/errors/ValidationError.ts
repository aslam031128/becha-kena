import { AppError } from './AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', code: string = ErrorCodes.BAD_REQUEST) {
    super(message, 400, code);
  }
}

export class ValidationError extends AppError {
  constructor(
    message = 'Validation Error',
    details?: Array<{ field?: string; message: string }>
  ) {
    super(message, 400, ErrorCodes.VALIDATION_ERROR, details);
  }
}
