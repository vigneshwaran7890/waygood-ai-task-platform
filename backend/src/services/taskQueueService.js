import getRedisClient from '../config/redis.js';
import env from '../config/env.js';

export async function enqueueTask(taskId) {
  const redis = getRedisClient();
  await redis.lpush(env.redisTaskQueue, JSON.stringify({ taskId }));
}
