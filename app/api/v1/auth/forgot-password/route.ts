import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";
import { sendPasswordResetEmail } from "@/app/lib/mailer";
import { rateLimit, clientIp } from "@/app/lib/rateLimit";

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  status: "Active" | "Inactive";
}

const bodySchema = z.object({
  email: z.string().trim().email(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  const { email } = parsed.data;

  const { allowed } = rateLimit(`forgot-password:${clientIp(request)}:${email}`, 3, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
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

  // Always a generic response — never reveal whether the email exists.
  return NextResponse.json({
    ok: true,
    message: "If an account exists for that email, a reset link has been sent.",
  });
}
