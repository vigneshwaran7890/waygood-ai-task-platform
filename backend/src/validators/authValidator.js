import ApiError from '../utils/ApiError.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegister(req, _res, next) {
  const { name, email, password } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return next(new ApiError(400, 'Name must be at least 2 characters long'));
  }
  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    return next(new ApiError(400, 'A valid email is required'));
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return next(new ApiError(400, 'Password must be at least 8 characters long'));
  }

  next();
}

export function validateLogin(req, _res, next) {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    return next(new ApiError(400, 'A valid email is required'));
  }
  if (!password || typeof password !== 'string') {
    return next(new ApiError(400, 'Password is required'));
  }

  next();
}
