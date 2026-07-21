import express from 'express';
import mongoose from 'mongoose';
import getRedisClient from '../config/redis.js';

const router = express.Router();

router.get('/live', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.get('/ready', async (_req, res) => {
  const mongoReady = mongoose.connection.readyState === 1;

  let redisReady = false;
  try {
    const redis = getRedisClient();
    const pong = await redis.ping();
    redisReady = pong === 'PONG';
  } catch (_err) {
    redisReady = false;
  }

  const ready = mongoReady && redisReady;
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ok' : 'not_ready',
    mongo: mongoReady ? 'connected' : 'disconnected',
    redis: redisReady ? 'connected' : 'disconnected',
  });
});

export default router;
