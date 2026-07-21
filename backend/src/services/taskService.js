import mongoose from 'mongoose';
import Task from '../models/taskModel.js';
import ApiError from '../utils/ApiError.js';
import { enqueueTask } from './taskQueueService.js';

export async function createTask({ userId, title, inputText, operationType }) {
  const task = await Task.create({
    user: userId,
    title: title.trim(),
    inputText,
    operationType,
    status: 'PENDING',
    logs: [{ level: 'INFO', message: 'Task created and queued for processing' }],
  });

  await enqueueTask(task._id.toString());

  return task;
}

export async function listTasks({ userId, page = 1, limit = 20, status }) {
  const query = { user: userId };
  if (status) query.status = status;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Task.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Task.countDocuments(query),
  ]);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getTaskById({ userId, taskId }) {
  if (!mongoose.isValidObjectId(taskId)) {
    throw new ApiError(400, 'Invalid task id');
  }

  const task = await Task.findOne({ _id: taskId, user: userId });
  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  return task;
}
