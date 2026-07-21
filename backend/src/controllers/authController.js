import asyncHandler from '../utils/asyncHandler.js';
import * as authService from '../services/authService.js';
import { setRefreshCookie, clearRefreshCookie, getRefreshCookie } from '../utils/refreshCookie.js';

function requestMeta(req) {
  return { ip: req.ip, userAgent: req.get('user-agent') };
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.registerUser({
    name,
    email,
    password,
    ...requestMeta(req),
  });

  setRefreshCookie(res, refreshToken);
  res.status(201).json({ success: true, data: { user, accessToken } });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.loginUser({
    email,
    password,
    ...requestMeta(req),
  });

  setRefreshCookie(res, refreshToken);
  res.status(200).json({ success: true, data: { user, accessToken } });
});

export const refresh = asyncHandler(async (req, res) => {
  const rawRefreshToken = getRefreshCookie(req);
  const { user, accessToken, refreshToken } = await authService.refreshSession({
    rawRefreshToken,
    ...requestMeta(req),
  });

  setRefreshCookie(res, refreshToken);
  res.status(200).json({ success: true, data: { user, accessToken } });
});

export const logout = asyncHandler(async (req, res) => {
  const rawRefreshToken = getRefreshCookie(req);
  await authService.logoutUser({ rawRefreshToken });

  clearRefreshCookie(res);
  res.status(200).json({ success: true, data: null });
});

export const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAllSessions({ userId: req.user._id });

  clearRefreshCookie(res);
  res.status(200).json({ success: true, data: null });
});

export const me = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: { user: req.user } });
});
