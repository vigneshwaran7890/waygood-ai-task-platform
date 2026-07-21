import env from '../config/env.js';

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path: env.refreshCookiePath,
    domain: env.cookieDomain,
  };
}

export function setRefreshCookie(res, token) {
  res.cookie(env.refreshCookieName, token, {
    ...baseCookieOptions(),
    maxAge: env.refreshTokenTtlMs,
  });
}

export function clearRefreshCookie(res) {
  res.clearCookie(env.refreshCookieName, baseCookieOptions());
}

export function getRefreshCookie(req) {
  return req.cookies?.[env.refreshCookieName] ?? null;
}
