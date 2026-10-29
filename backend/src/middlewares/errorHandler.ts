import { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodIssue } from 'zod';
import { AppError } from '../errors/AppError.js';
import { sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { env } from '../config/env.js';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // 1. Known Domain Operational Error
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`[AppError 5xx] ${err.message}`, {
        code: err.code,
        path: req.originalUrl,
        stack: err.stack
      });
    } else {
      logger.warn(`[AppError ${err.statusCode}] ${err.message}`, {
        code: err.code,
        path: req.originalUrl
      });
    }

    sendError(res, err.statusCode, err.code, err.message, err.details, req.originalUrl, err.extra);
    return;
  }

  // 2. Zod Validation Error
  if (err instanceof ZodError) {
    const details = err.errors.map((e: ZodIssue) => ({
      field: e.path.join('.').replace(/^(body|query|params)\./, ''),
      message: e.message
    }));

    logger.warn(`[ValidationError] ${req.method} ${req.originalUrl}`, { details });
    sendError(
      res,
      400,
      ErrorCodes.VALIDATION_ERROR,
      'Validation failed for incoming request data',
      details,
      req.originalUrl
    );
    return;
  }

  // 3. Mongoose Cast Error (Invalid ObjectId)
  if (err.name === 'CastError') {
    logger.warn(`[CastError] Invalid ${err.path}: ${err.value}`);
    sendError(
      res,
      400,
      ErrorCodes.BAD_REQUEST,
      `Invalid format for parameter '${err.path}'`,
      [{ field: err.path, message: `Invalid identifier: ${err.value}` }],
      req.originalUrl
    );
    return;
  }

  // 4. Mongoose Validation Error
  if (err.name === 'ValidationError' && err.errors) {
    const details = Object.keys(err.errors).map((key) => ({
      field: key,
      message: err.errors[key].message
    }));

    logger.warn(`[MongooseValidationError] ${req.originalUrl}`, { details });
    sendError(
      res,
      400,
      ErrorCodes.VALIDATION_ERROR,
      'Database schema validation failed',
      details,
      req.originalUrl
    );
    return;
  }

  // 5. MongoDB Duplicate Key (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'resource';
    logger.warn(`[DuplicateKeyError] Duplicate key on ${field}`);
    sendError(
      res,
      409,
      ErrorCodes.CONFLICT,
      `A record with this ${field} already exists.`,
      [{ field, message: `Duplicate value provided for ${field}` }],
      req.originalUrl
    );
    return;
  }

  // 6. JWT Errors
  if (err.name === 'JsonWebTokenError') {
    sendError(
      res,
      401,
      ErrorCodes.INVALID_TOKEN,
      'Invalid authorization token provided',
      undefined,
      req.originalUrl
    );
    return;
  }

  if (err.name === 'TokenExpiredError') {
    sendError(
      res,
      401,
      ErrorCodes.TOKEN_EXPIRED,
      'Authorization token has expired',
      undefined,
      req.originalUrl
    );
    return;
  }

  // 7. Unhandled Unexpected Internal Errors (500)
  logger.error(`[UnhandledError] ${err.message || 'Unknown server error'}`, {
    path: req.originalUrl,
    method: req.method,
    stack: err.stack
  });

  const message =
    env.NODE_ENV === 'production'
      ? 'An unexpected internal server error occurred.'
      : err.message || 'Internal Server Error';

  sendError(
    res,
    500,
    ErrorCodes.INTERNAL_SERVER_ERROR,
    message,
    undefined,
    req.originalUrl
  );
};
