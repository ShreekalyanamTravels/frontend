import { NextResponse } from "next/server";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";
import { sendOtpSms } from "@/app/lib/sms";
import { rateLimit, clientIp } from "@/app/lib/rateLimit";

const MOBILE_RE = /^[6-9]\d{9}$/;
const OTP_TTL_MINUTES = 10;

const bodySchema = z.object({
  mobile: z.string().trim().regex(MOBILE_RE, "Enter a valid 10-digit mobile number"),
});

interface UserRow extends RowDataPacket {
  id: number;
  status: "Active" | "Inactive";
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" }, { status: 400 });
  }
  const { mobile } = parsed.data;

  // Caps SMS spend as much as it guards against brute force — tighter than a plain login limiter.
  const { allowed } = rateLimit(`mobile-otp-send:${clientIp(request)}:${mobile}`, 3, 10 * 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many OTP requests. Try again shortly." }, { status: 429 });
  }

  const [rows] = await pool.query<UserRow[]>("SELECT id, status FROM users WHERE mobile = ? LIMIT 1", [mobile]);
  const user = rows[0];

  // Always return the same generic response — same reasoning as forgot-password — so this
  // endpoint can't be used to enumerate which mobile numbers have an account.
  if (user && user.status === "Active") {
    const otp = generateOtp();
    // Computed in JS rather than via SQL NOW() + INTERVAL — the DB server's clock was found to be
    // several hours off from real time, which made every OTP look already-expired the moment
    // verify-otp compared it against Date.now(). Writing an absolute JS-computed timestamp instead
    // makes expiry independent of the DB server's clock being correct.
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);
    await pool.query(
      "UPDATE users SET mobile_otp = ?, mobile_otp_expires_at = ? WHERE id = ?",
      [otp, expiresAt, user.id]
    );
    try {
      await sendOtpSms(mobile, otp);
    } catch (err) {
      console.error("Failed to send login OTP SMS:", err);
    }
  }

  return NextResponse.json({ message: "If this mobile number is registered, an OTP has been sent." });
}
