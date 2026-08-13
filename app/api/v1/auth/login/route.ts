import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";
import { createAccessToken } from "@/app/lib/apiAuth";
import { issueRefreshToken } from "@/app/lib/refreshTokens";
import { rateLimit, clientIp } from "@/app/lib/rateLimit";

interface UserRow extends RowDataPacket {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  password: string;
  status: "Active" | "Inactive";
}

const bodySchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  deviceLabel: z.string().max(255).optional(),
  deviceId: z.string().max(255).optional(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { email, password, deviceLabel, deviceId } = parsed.data;

  // Brute-force guard: keyed on IP+email so one attacker can't lock out a legitimate user's
  // account by hammering their email from many IPs, while still throttling a single attacker.
  // Mobile has no reCAPTCHA widget to fall back on (that's a web-browser control), so this rate
  // limit is the only anti-brute-force layer on this endpoint — keep it in place.
  const { allowed } = rateLimit(`login:${clientIp(request)}:${email}`, 5, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many login attempts. Try again shortly." }, { status: 429 });
  }

  const [rows] = await pool.query<UserRow[]>(
    "SELECT id, first_name, last_name, email, password, status FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  const user = rows[0];

  if (!user || user.status !== "Active" || !(await bcrypt.compare(password, user.password))) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
  const corporateId = String(user.id);

  if (deviceId) {
    // Best-effort — must never block login itself, including if db/migrations/2026_08_users_device_id.sql
    // hasn't been run against this database yet (missing column would otherwise fail every login).
    await pool.query("UPDATE users SET device_id = ? WHERE id = ?", [deviceId, user.id]).catch(err => {
      console.error("Failed to record device_id on login:", err);
    });
  }

  const accessToken = await createAccessToken({ userId: user.id, email: user.email, name, corporateId });
  const { refreshToken } = await issueRefreshToken(user.id, undefined, deviceLabel);

  return NextResponse.json({
    accessToken,
    refreshToken,
    expiresIn: 15 * 60,
    user: { id: user.id, email: user.email, name, corporateId, status: user.status },
  });
}
