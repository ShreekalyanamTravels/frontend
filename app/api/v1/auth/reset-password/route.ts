import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";
import { rateLimit, clientIp } from "@/app/lib/rateLimit";

interface TokenRow extends RowDataPacket {
  email: string;
  token: string;
  created_at: string;
}

const TOKEN_TTL_MS = 60 * 60 * 1000; // 60 minutes

const bodySchema = z.object({
  email: z.string().trim().email(),
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing or invalid fields (password must be 8+ characters)" }, { status: 400 });
  }
  const { email, token, newPassword } = parsed.data;

  const { allowed } = rateLimit(`reset-password:${clientIp(request)}:${email}`, 5, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const [rows] = await pool.query<TokenRow[]>(
    "SELECT email, token, created_at FROM password_reset_tokens WHERE email = ? LIMIT 1",
    [email]
  );
  const row = rows[0];
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const expired = row ? Date.now() - new Date(row.created_at).getTime() > TOKEN_TTL_MS : true;

  if (!row || row.token !== hashedToken || expired) {
    return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await pool.query("UPDATE users SET password = ? WHERE email = ?", [newHash, email]);
  await pool.query("DELETE FROM password_reset_tokens WHERE email = ?", [email]);

  return NextResponse.json({ ok: true });
}
