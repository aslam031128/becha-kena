import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z
    .string()
    .default('5000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive()),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database & Cache
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  // JWT Configuration
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Cryptography & Zero-Knowledge Vaults
  KMS_SECRET_KEY: z
    .string()
    .length(64, 'KMS_SECRET_KEY must be a 64-character hex string (32 bytes) for AES-256'),
  HMAC_SALT: z.string().min(32, 'HMAC_SALT must be at least 32 characters'),

  // AWS S3
  AWS_REGION: z.string().default('ap-southeast-1'),
  AWS_S3_BUCKET: z.string().default('becha-kena-uploads'),
  AWS_ACCESS_KEY_ID: z.string().default('mock_aws_access_key_id'),
  AWS_SECRET_ACCESS_KEY: z.string().default('mock_aws_secret_access_key'),

  // KYC Provider
  KYC_PROVIDER: z.enum(['porichoy', 'shadhin', 'mock']).default('mock'),
  PORICHOY_API_KEY: z.string().default('mock_porichoy_api_key'),
  PORICHOY_BASE_URL: z.string().default('https://api.porichoybd.com'),

  // SMS Provider
  SMS_PROVIDER: z.enum(['alpha_sms', 'twilio', 'mock']).default('mock'),
  ALPHA_SMS_API_KEY: z.string().default('mock_alpha_sms_api_key'),

  // Client Web App URL
  CLIENT_URL: z.string().default('http://localhost:3000')
});

const parseEnv = () => {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ FATAL: Invalid Environment Configuration:');
    console.error(JSON.stringify(parsed.error.format(), null, 2));
    process.exit(1);
  }
  return parsed.data;
};

export const env = parseEnv();
export type EnvConfig = z.infer<typeof envSchema>;
