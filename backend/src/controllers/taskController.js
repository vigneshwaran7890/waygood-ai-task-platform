import asyncHandler from '../utils/asyncHandler.js';
import * as taskService from '../services/taskService.js';

export const createTask = asyncHandler(async (req, res) => {
  const { title, inputText, operationType } = req.body;
  const task = await taskService.createTask({
    userId: req.user._id,
    title,
    inputText,
    operationType,
  });
  res.status(201).json({ success: true, data: { task } });
});

export const listTasks = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const { status } = req.query;

  const result = await taskService.listTasks({ userId: req.user._id, page, limit, status });
  res.status(200).json({ success: true, data: result });
});

export const getTask = asyncHandler(async (req, res) => {
  const task = await taskService.getTaskById({ userId: req.user._id, taskId: req.params.id });
  res.status(200).json({ success: true, data: { task } });
});
