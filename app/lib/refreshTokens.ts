import crypto from "crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import pool from "@/app/lib/db";

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface TokenRow extends RowDataPacket {
  id: number;
  user_id: number;
  family_id: string;
  revoked_at: string | null;
  expires_at: string;
}

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export interface IssuedTokens {
  refreshToken: string;
  familyId: string;
}

export async function issueRefreshToken(
  userId: number,
  familyId: string = crypto.randomUUID(),
  deviceLabel?: string | null
): Promise<IssuedTokens> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await pool.query<ResultSetHeader>(
    `INSERT INTO api_refresh_tokens (user_id, family_id, token_hash, device_label, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, familyId, hashToken(rawToken), deviceLabel ?? null, expiresAt]
  );

  return { refreshToken: rawToken, familyId };
}

export class RefreshTokenError extends Error {}

// Rotation with reuse detection: a refresh token is single-use. If a token that's already been
// rotated (revoked_at set, replaced_by set) is presented again, that's a strong signal the token
// was stolen and both the legitimate and the attacker's client are racing to use it — the entire
// family (that device's session chain) is revoked so both are forced to re-authenticate.
export async function rotateRefreshToken(
  rawToken: string,
  deviceLabel?: string | null
): Promise<{ userId: number; refreshToken: string }> {
  const tokenHash = hashToken(rawToken);
  const [rows] = await pool.query<TokenRow[]>(
    "SELECT id, user_id, family_id, revoked_at, expires_at FROM api_refresh_tokens WHERE token_hash = ? LIMIT 1",
    [tokenHash]
  );
  const row = rows[0];
  if (!row) throw new RefreshTokenError("Invalid refresh token");

  if (row.revoked_at) {
    await pool.query("UPDATE api_refresh_tokens SET revoked_at = NOW() WHERE family_id = ? AND revoked_at IS NULL", [
      row.family_id,
    ]);
    throw new RefreshTokenError("Refresh token reuse detected — please log in again");
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    throw new RefreshTokenError("Refresh token expired");
  }

  const { refreshToken } = await issueRefreshToken(row.user_id, row.family_id, deviceLabel);
  const [newRows] = await pool.query<TokenRow[]>(
    "SELECT id FROM api_refresh_tokens WHERE token_hash = ? LIMIT 1",
    [hashToken(refreshToken)]
  );

  await pool.query(
    "UPDATE api_refresh_tokens SET revoked_at = NOW(), replaced_by = ?, last_used_at = NOW() WHERE id = ?",
    [newRows[0].id, row.id]
  );

  return { userId: row.user_id, refreshToken };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  await pool.query("UPDATE api_refresh_tokens SET revoked_at = NOW() WHERE token_hash = ? AND revoked_at IS NULL", [
    hashToken(rawToken),
  ]);
}

export async function revokeAllForUser(userId: number): Promise<void> {
  await pool.query("UPDATE api_refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL", [
    userId,
  ]);
}
