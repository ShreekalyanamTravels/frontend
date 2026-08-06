import { NextResponse } from "next/server";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";
import { createAccessToken } from "@/app/lib/apiAuth";
import { rotateRefreshToken, RefreshTokenError } from "@/app/lib/refreshTokens";
import { rateLimit, clientIp } from "@/app/lib/rateLimit";

interface UserRow extends RowDataPacket {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  status: "Active" | "Inactive";
}

const bodySchema = z.object({
  refreshToken: z.string().min(1),
  deviceLabel: z.string().max(255).optional(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { allowed } = rateLimit(`refresh:${clientIp(request)}`, 20, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const { userId, refreshToken } = await rotateRefreshToken(parsed.data.refreshToken, parsed.data.deviceLabel);

    const [rows] = await pool.query<UserRow[]>(
      "SELECT id, first_name, last_name, email, status FROM users WHERE id = ? LIMIT 1",
      [userId]
    );
    const user = rows[0];
    if (!user || user.status !== "Active") {
      return NextResponse.json({ error: "Account is no longer active" }, { status: 401 });
    }

    const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
    const corporateId = String(user.id);
    const accessToken = await createAccessToken({ userId: user.id, email: user.email, name, corporateId });

    return NextResponse.json({
      accessToken,
      refreshToken,
      expiresIn: 15 * 60,
      user: { id: user.id, email: user.email, name, corporateId, status: user.status },
    });
  } catch (err) {
    if (err instanceof RefreshTokenError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}
