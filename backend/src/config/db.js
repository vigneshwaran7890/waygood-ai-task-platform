import mongoose from 'mongoose';
import env from './env.js';

async function connectDB() {
  mongoose.connection.on('connected', () => {
    console.log('[mongo] connected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('[mongo] connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[mongo] disconnected');
  });

  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 10000,
  });
}

export default connectDB;
