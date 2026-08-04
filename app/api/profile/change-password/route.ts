import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";
import { verifySessionToken, SESSION_COOKIE } from "@/app/lib/auth";

interface PasswordRow extends RowDataPacket {
  password: string;
}

export async function POST(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Current and new password are required" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  }

  const [rows] = await pool.query<PasswordRow[]>(
    "SELECT password FROM users WHERE id = ? LIMIT 1",
    [session.userId]
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await pool.query("UPDATE users SET password = ? WHERE id = ?", [newHash, session.userId]);

  return NextResponse.json({ ok: true });
}
