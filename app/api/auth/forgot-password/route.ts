import { NextResponse } from "next/server";
import crypto from "crypto";
import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";
import { verifyRecaptcha } from "@/app/lib/recaptcha";
import { sendPasswordResetEmail } from "@/app/lib/mailer";

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  status: "Active" | "Inactive";
}

export async function POST(request: Request) {
  const { email, recaptchaToken } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  if (!(await verifyRecaptcha(recaptchaToken))) {
    return NextResponse.json({ error: "reCAPTCHA verification failed" }, { status: 400 });
  }

  const [rows] = await pool.query<UserRow[]>(
    "SELECT id, email, status FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  const user = rows[0];

  if (user && user.status === "Active") {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    await pool.query("DELETE FROM password_reset_tokens WHERE email = ?", [user.email]);
    await pool.query(
      "INSERT INTO password_reset_tokens (email, token, created_at) VALUES (?, ?, NOW())",
      [user.email, hashedToken]
    );

    const resetUrl = `${process.env.APP_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
    await sendPasswordResetEmail(user.email, resetUrl);
  }

  return NextResponse.json({
    ok: true,
    message: "If an account exists for that email, a reset link has been sent.",
  });
}
