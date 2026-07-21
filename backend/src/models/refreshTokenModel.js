import crypto from 'node:crypto';
import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // SHA-256 hash of the raw refresh token. The raw token is never persisted,
    // so a database read alone can never yield a usable credential.
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    // All tokens produced by successive rotations of one login session share a
    // family id. Detecting reuse of any token in a family lets us revoke the
    // whole chain at once (see tokenService.detectReuseAndRevokeFamily).
    family: {
      type: String,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    replacedByTokenHash: {
      type: String,
      default: null,
    },
    createdByIp: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// TTL index: MongoDB automatically deletes documents once expiresAt is in the
// past, so revoked/expired refresh tokens don't accumulate forever.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

refreshTokenSchema.statics.hashToken = function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
};

refreshTokenSchema.methods.isActive = function isActive() {
  return !this.revokedAt && this.expiresAt.getTime() > Date.now();
};

export default mongoose.model('RefreshToken', refreshTokenSchema);
