import winston from 'winston';
import { env } from '../config/env.js';

// Sensitive keys to redact from logs
const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'refreshtoken',
  'accesstoken',
  'authorization',
  'otp',
  'nid',
  'nidhash',
  'encryptedniddata',
  'secret',
  'apiKey'
]);

const redactSensitiveData = winston.format((info) => {
  const redact = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(redact);
    }

    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        cleaned[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        cleaned[key] = redact(value);
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  };

  return redact(info);
});

const logFormat = winston.format.combine(
  redactSensitiveData(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const devFormat = winston.format.combine(
  redactSensitiveData(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level}: ${message}${stack ? `\n${stack}` : ''}${metaStr}`;
  })
);

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: logFormat,
  defaultMeta: { service: 'becha-kena-backend' },
  transports: [
    new winston.transports.Console({
      format: env.NODE_ENV === 'development' ? devFormat : logFormat
    })
  ]
});

// In production, also log errors and general events to files
if (env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    })
  );
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 5
    })
  );
}
