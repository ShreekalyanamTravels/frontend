import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";
import { requireApiAuth, apiErrorResponse } from "@/app/lib/apiAuth";
import { revokeAllForUser } from "@/app/lib/refreshTokens";

interface PasswordRow extends RowDataPacket {
  password: string;
}

const bodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const session = await requireApiAuth(request);

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Current and new password are required (new password must be 8+ characters)" }, { status: 400 });
    }
    const { currentPassword, newPassword } = parsed.data;

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

    // A password change should end every other logged-in session/device, not just leave old
    // refresh tokens usable — force re-authentication everywhere else.
    await revokeAllForUser(session.userId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
