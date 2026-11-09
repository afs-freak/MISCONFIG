
import dotenv from 'dotenv';
import path from 'node:path';
import { z } from 'zod';

dotenv.config({
  path: path.resolve(process.cwd(), '../../.env'),
});

const schema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must contain at least 32 characters'),
  DATABASE_URL: z.string().url(),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/misconfig'),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().max(20).default(5),
  AI_PROVIDER: z.enum(['openai', 'gemini']).default('openai'),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
});

export const env = schema.parse(process.env);
