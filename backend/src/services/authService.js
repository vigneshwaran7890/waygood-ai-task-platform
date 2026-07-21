import bcrypt from 'bcryptjs';
import User from '../models/userModel.js';
import ApiError from '../utils/ApiError.js';
import tokenService from './tokenService.js';

const SALT_ROUNDS = 12;

export async function registerUser({ name, email, password, ip, userAgent }) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name: name.trim(), email: email.toLowerCase(), passwordHash });

  const { accessToken, refreshToken } = await tokenService.issueTokenPair({
    userId: user._id.toString(),
    ip,
    userAgent,
  });

  return { user: user.toSafeObject(), accessToken, refreshToken };
}

export async function loginUser({ email, password, ip, userAgent }) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const { accessToken, refreshToken } = await tokenService.issueTokenPair({
    userId: user._id.toString(),
    ip,
    userAgent,
  });

  return { user: user.toSafeObject(), accessToken, refreshToken };
}

export async function refreshSession({ rawRefreshToken, ip, userAgent }) {
  if (!rawRefreshToken) {
    throw new ApiError(401, 'No refresh token provided');
  }

  const { accessToken, refreshToken, userId } = await tokenService.rotateRefreshToken({
    rawToken: rawRefreshToken,
    ip,
    userAgent,
  });

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(401, 'User no longer exists');
  }

  return { user: user.toSafeObject(), accessToken, refreshToken };
}

export async function logoutUser({ rawRefreshToken }) {
  if (rawRefreshToken) {
    await tokenService.revokeToken(rawRefreshToken);
  }
}

export async function logoutAllSessions({ userId }) {
  await tokenService.revokeAllForUser(userId);
}
