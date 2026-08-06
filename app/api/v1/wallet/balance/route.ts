import { NextResponse } from "next/server";
import { requireApiAuth, apiErrorResponse } from "@/app/lib/apiAuth";
import { getWalletSnapshot } from "@/app/lib/wallet";

export async function GET(request: Request) {
  try {
    const session = await requireApiAuth(request);
    const snapshot = await getWalletSnapshot(session.userId);
    return NextResponse.json(snapshot);
  } catch (err) {
    return apiErrorResponse(err);
  }
}
