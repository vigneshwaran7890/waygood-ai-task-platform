import ApiError from '../utils/ApiError.js';
import User from '../models/userModel.js';
import asyncHandler from '../utils/asyncHandler.js';
import tokenService from '../services/tokenService.js';

export const protect = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new ApiError(401, 'Not authorized, no access token provided');
  }

  let payload;
  try {
    payload = tokenService.verifyAccessToken(token);
  } catch (_err) {
    throw new ApiError(401, 'Not authorized, invalid or expired access token');
  }

  const user = await User.findById(payload.sub).select('_id name email');
  if (!user) {
    throw new ApiError(401, 'Not authorized, user no longer exists');
  }

  req.user = user;
  next();
});
