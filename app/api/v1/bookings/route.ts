import { NextResponse } from "next/server";
import { requireApiAuth, apiErrorResponse } from "@/app/lib/apiAuth";
import { listBookingsForUser } from "@/app/lib/bookingList";

export async function GET(request: Request) {
  try {
    const session = await requireApiAuth(request);
    const result = await listBookingsForUser(String(session.userId));
    return NextResponse.json({ bookings: result });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
