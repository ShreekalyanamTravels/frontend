import { NextResponse } from "next/server";
import { requireApiAuth, apiErrorResponse } from "@/app/lib/apiAuth";
import { listInsuranceBookingsForUser } from "@/app/lib/insuranceBookingList";

export async function GET(request: Request) {
  try {
    const session = await requireApiAuth(request);
    const bookings = await listInsuranceBookingsForUser(session.name);
    return NextResponse.json({ bookings });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
