import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE } from "@/app/lib/auth";
import { getWalletSnapshot } from "@/app/lib/wallet";

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const snapshot = await getWalletSnapshot(session.userId);
  return NextResponse.json(snapshot);
}
