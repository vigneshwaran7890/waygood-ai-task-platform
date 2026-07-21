import Redis from 'ioredis';
import env from './env.js';

let client;

function getRedisClient() {
  if (!client) {
    client = new Redis(env.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 200, 5000);
        return delay;
      },
    });

    client.on('connect', () => console.log('[redis] connected'));
    client.on('error', (err) => console.error('[redis] error:', err.message));
    client.on('reconnecting', () => console.warn('[redis] reconnecting...'));
  }

  return client;
}

export default getRedisClient;
