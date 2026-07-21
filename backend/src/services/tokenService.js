import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import RefreshToken from '../models/refreshTokenModel.js';
import ApiError from '../utils/ApiError.js';

function signAccessToken(userId) {
  return jwt.sign({ sub: userId, type: 'access' }, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpiresIn,
  });
}

function signRefreshToken(userId, family) {
  // jti guarantees a unique token (and therefore a unique tokenHash) even when
  // two refreshes for the same user+family happen within the same second,
  // where JWT's second-granularity `iat` alone would otherwise produce two
  // byte-identical tokens and collide on the unique tokenHash index.
  const jti = crypto.randomUUID();
  return jwt.sign({ sub: userId, type: 'refresh', family, jti }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn,
  });
}

function verifyAccessToken(token) {
  const payload = jwt.verify(token, env.jwtAccessSecret);
  if (payload.type !== 'access') {
    throw new ApiError(401, 'Invalid token type');
  }
  return payload;
}

function verifyRefreshTokenSignature(token) {
  const payload = jwt.verify(token, env.jwtRefreshSecret);
  if (payload.type !== 'refresh') {
    throw new ApiError(401, 'Invalid token type');
  }
  return payload;
}

/**
 * Issues a brand-new access/refresh pair and starts a new rotation family.
 * Used on register/login (i.e. a fresh session, not a rotation of an existing one).
 */
async function issueTokenPair({ userId, ip, userAgent }) {
  const family = crypto.randomUUID();
  return issueTokenPairInFamily({ userId, family, ip, userAgent });
}

async function issueTokenPairInFamily({ userId, family, ip, userAgent }) {
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId, family);

  await RefreshToken.create({
    user: userId,
    tokenHash: RefreshToken.hashToken(refreshToken),
    family,
    expiresAt: new Date(Date.now() + env.refreshTokenTtlMs),
    createdByIp: ip ?? null,
    userAgent: userAgent ?? null,
  });

  return { accessToken, refreshToken };
}

/**
 * Rotates a refresh token: validates it, revokes it, and issues a new pair in
 * the same family. If the presented token was already revoked/replaced (i.e.
 * someone is replaying a stolen token after the legitimate client already
 * rotated it), the entire family is revoked as a theft-response measure.
 */
async function rotateRefreshToken({ rawToken, ip, userAgent }) {
  let payload;
  try {
    payload = verifyRefreshTokenSignature(rawToken);
  } catch (_err) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const tokenHash = RefreshToken.hashToken(rawToken);
  const stored = await RefreshToken.findOne({ tokenHash });

  if (!stored) {
    // Signature is valid but we have no record of it — either it predates this
    // server's database, or it was already pruned by the TTL index. Treat as invalid.
    throw new ApiError(401, 'Refresh token not recognized');
  }

  if (stored.revokedAt) {
    // This exact token was already used once before. A legitimate client never
    // presents the same refresh token twice (it always stores the newest one),
    // so this is a strong signal of token theft/replay. Kill the whole family.
    await revokeFamily(stored.family);
    throw new ApiError(401, 'Refresh token reuse detected; all sessions revoked');
  }

  if (stored.expiresAt.getTime() <= Date.now()) {
    throw new ApiError(401, 'Refresh token has expired');
  }

  const { accessToken, refreshToken } = await issueTokenPairInFamily({
    userId: payload.sub,
    family: stored.family,
    ip,
    userAgent,
  });

  stored.revokedAt = new Date();
  stored.replacedByTokenHash = RefreshToken.hashToken(refreshToken);
  await stored.save();

  return { accessToken, refreshToken, userId: payload.sub };
}

async function revokeFamily(family) {
  await RefreshToken.updateMany(
    { family, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}

/** Revokes a single refresh token (used on explicit logout of one session). */
async function revokeToken(rawToken) {
  const tokenHash = RefreshToken.hashToken(rawToken);
  await RefreshToken.updateOne(
    { tokenHash, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}

/** Revokes every active refresh token for a user ("log out of all devices"). */
async function revokeAllForUser(userId) {
  await RefreshToken.updateMany(
    { user: userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}

export default {
  issueTokenPair,
  rotateRefreshToken,
  revokeToken,
  revokeAllForUser,
  verifyAccessToken,
};
