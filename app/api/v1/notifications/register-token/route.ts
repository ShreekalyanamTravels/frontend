import { NextResponse } from "next/server";
import { z } from "zod";
import pool from "@/app/lib/db";
import { requireApiAuth, apiErrorResponse } from "@/app/lib/apiAuth";

const bodySchema = z.object({
  pushToken: z.string().min(1).max(255),
});

export async function POST(request: Request) {
  try {
    const session = await requireApiAuth(request);
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" }, { status: 400 });
    }

    await pool.query("UPDATE users SET push_token = ? WHERE id = ?", [parsed.data.pushToken, session.userId]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
