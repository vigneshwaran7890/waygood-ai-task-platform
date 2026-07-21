import mongoose from 'mongoose';

export const OPERATION_TYPES = ['UPPERCASE', 'LOWERCASE', 'REVERSE_STRING', 'WORD_COUNT'];
export const TASK_STATUSES = ['PENDING', 'RUNNING', 'SUCCESS', 'FAILED'];

const logEntrySchema = new mongoose.Schema(
  {
    timestamp: { type: Date, default: Date.now },
    level: { type: String, enum: ['INFO', 'ERROR'], default: 'INFO' },
    message: { type: String, required: true },
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    inputText: {
      type: String,
      required: true,
      maxlength: 20000,
    },
    operationType: {
      type: String,
      enum: OPERATION_TYPES,
      required: true,
    },
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: 'PENDING',
      index: true,
    },
    result: {
      type: String,
      default: null,
    },
    logs: {
      type: [logEntrySchema],
      default: [],
    },
    errorMessage: {
      type: String,
      default: null,
    },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

taskSchema.index({ user: 1, createdAt: -1 });

const Task = mongoose.model('Task', taskSchema);

export default Task;
