import { NextResponse } from "next/server";
import { requireApiAuth, apiErrorResponse } from "@/app/lib/apiAuth";
import { revokeAllForUser } from "@/app/lib/refreshTokens";

export async function POST(request: Request) {
  try {
    const session = await requireApiAuth(request);
    await revokeAllForUser(session.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
