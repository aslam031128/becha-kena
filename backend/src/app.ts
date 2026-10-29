import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { globalLimiter } from './middlewares/rateLimiter.js';
import { NotFoundError } from './errors/HttpErrors.js';
import { sendSuccess } from './utils/response.js';
import authRouter from './routes/auth.routes.js';
import userRouter from './routes/user.routes.js';
import kycRouter from './routes/kyc.routes.js';

export const createApp = (): Express => {
  const app = express();

  // 1. Security Headers
  app.use(helmet());

  // 2. Cross-Origin Resource Sharing
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-UUID']
    })
  );

  // 3. Body Parsing & Cookies
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // 4. HTTP Request Logging
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
  }

  // 5. Health Check Endpoint
  app.get('/health', (_req: Request, res: Response) => {
    sendSuccess(res, {
      status: 'ok',
      service: 'becha-kena-backend',
      environment: env.NODE_ENV,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });
  });

  // 6. Base API Router
  const apiRouter = express.Router();

  // Apply Global Rate Limiting to all API endpoints
  app.use('/api', globalLimiter);

  apiRouter.get('/', (_req: Request, res: Response) => {
    sendSuccess(res, {
      name: 'Becha-Kena API',
      version: 'v1',
      description: "Bangladesh's First NID-Verified C2C Resale Marketplace API"
    });
  });

  // Authentication & Device Security (/api/v1/auth)
  apiRouter.use('/auth', authRouter);

  // User & Profile Management (/api/v1/users)
  apiRouter.use('/users', userRouter);

  // Identity Verification & Fast E-KYC (/api/v1/kyc)
  apiRouter.use('/kyc', kycRouter);

  // Mount API Router under /api/v1
  app.use('/api/v1', apiRouter);

  // 7. Catch-all 404 handler for unmatched routes
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`));
  });

  // 8. Global Centralized Error Handler
  app.use(errorHandler);

  return app;
};
