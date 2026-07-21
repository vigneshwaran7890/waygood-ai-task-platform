import ApiError from '../utils/ApiError.js';
import { OPERATION_TYPES } from '../models/taskModel.js';

export function validateCreateTask(req, _res, next) {
  const { title, inputText, operationType } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return next(new ApiError(400, 'Task title is required'));
  }
  if (title.length > 200) {
    return next(new ApiError(400, 'Task title must be 200 characters or fewer'));
  }
  if (!inputText || typeof inputText !== 'string' || !inputText.trim()) {
    return next(new ApiError(400, 'Input text is required'));
  }
  if (inputText.length > 20000) {
    return next(new ApiError(400, 'Input text must be 20000 characters or fewer'));
  }
  if (!operationType || !OPERATION_TYPES.includes(operationType)) {
    return next(
      new ApiError(400, `operationType must be one of: ${OPERATION_TYPES.join(', ')}`)
    );
  }

  next();
}
