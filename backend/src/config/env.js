import dotenv from 'dotenv';

dotenv.config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV || 'development';

const env = {
  nodeEnv,
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: required('MONGO_URI', 'mongodb://localhost:27017/ai_task_platform'),
  redisUrl: required('REDIS_URL', 'redis://localhost:6379'),
  redisTaskQueue: process.env.REDIS_TASK_QUEUE || 'ai:tasks:queue',

  jwtAccessSecret: required('JWT_ACCESS_SECRET'),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',

  jwtRefreshSecret: required('JWT_REFRESH_SECRET'),
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  refreshTokenTtlMs: parseInt(process.env.REFRESH_TOKEN_TTL_MS || String(30 * 24 * 60 * 60 * 1000), 10),

  refreshCookieName: process.env.REFRESH_COOKIE_NAME || 'refreshToken',
  refreshCookiePath: process.env.REFRESH_COOKIE_PATH || '/api/auth',
  cookieSecure: (process.env.COOKIE_SECURE ?? String(nodeEnv === 'production')) === 'true',
  cookieSameSite: process.env.COOKIE_SAME_SITE || 'strict',
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,

  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
};

export default env;
