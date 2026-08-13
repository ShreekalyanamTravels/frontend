import { NextResponse } from "next/server";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";
import { createAccessToken } from "@/app/lib/apiAuth";
import { issueRefreshToken } from "@/app/lib/refreshTokens";
import { rateLimit, clientIp } from "@/app/lib/rateLimit";

const MOBILE_RE = /^[6-9]\d{9}$/;

const bodySchema = z.object({
  mobile: z.string().trim().regex(MOBILE_RE, "Enter a valid 10-digit mobile number"),
  otp: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit OTP"),
  deviceId: z.string().max(255).optional(),
});

interface UserRow extends RowDataPacket {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  status: "Active" | "Inactive";
  mobile_otp: string | null;
  mobile_otp_expires_at: string | null;
}

// Bearer-token (mobile app) counterpart of /api/auth/login/mobile/verify-otp. Same OTP
// validation/single-use logic as the cookie-session route, but issues accessToken/refreshToken
// (matching /api/v1/auth/login's response shape) instead of setting a Set-Cookie session.
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" }, { status: 400 });
  }
  const { mobile, otp, deviceId } = parsed.data;

  // 6-digit OTP is only 1M combinations — throttle guessing separately from the send limiter.
  const { allowed } = rateLimit(`mobile-otp-verify:${clientIp(request)}:${mobile}`, 5, 10 * 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  const [userRows] = await pool.query<UserRow[]>(
    "SELECT id, first_name, last_name, email, status, mobile_otp, mobile_otp_expires_at FROM users WHERE mobile = ? LIMIT 1",
    [mobile]
  );
  const user = userRows[0];
  const expired = user?.mobile_otp_expires_at ? new Date(user.mobile_otp_expires_at).getTime() < Date.now() : true;

  if (!user || user.status !== "Active" || !user.mobile_otp || user.mobile_otp !== otp || expired) {
    return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
  }

  // Single-use: clear it immediately so the same OTP can't be replayed.
  await pool.query("UPDATE users SET mobile_otp = NULL, mobile_otp_expires_at = NULL WHERE id = ?", [user.id]);

  if (deviceId) {
    // Best-effort — must never block login itself, including if db/migrations/2026_08_users_device_id.sql
    // hasn't been run against this database yet (missing column would otherwise fail every login).
    await pool.query("UPDATE users SET device_id = ? WHERE id = ?", [deviceId, user.id]).catch(err => {
      console.error("Failed to record device_id on login:", err);
    });
  }

  const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
  const corporateId = String(user.id);

  const accessToken = await createAccessToken({ userId: user.id, email: user.email, name, corporateId });
  const { refreshToken } = await issueRefreshToken(user.id);

  return NextResponse.json({
    accessToken,
    refreshToken,
    expiresIn: 15 * 60,
    user: { id: user.id, email: user.email, name, corporateId, status: user.status },
  });
}
