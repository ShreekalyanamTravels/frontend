import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";

interface TokenRow extends RowDataPacket {
  email: string;
  token: string;
  created_at: string;
}

const TOKEN_TTL_MS = 60 * 60 * 1000; // 60 minutes

export async function POST(request: Request) {
  const { email, token, newPassword } = await request.json();

  if (!email || !token || !newPassword) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
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
