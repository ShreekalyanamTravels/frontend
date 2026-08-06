import { NextResponse } from "next/server";
import { z } from "zod";
import { revokeRefreshToken } from "@/app/lib/refreshTokens";

const bodySchema = z.object({
  refreshToken: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  await revokeRefreshToken(parsed.data.refreshToken);
  return NextResponse.json({ ok: true });
}
