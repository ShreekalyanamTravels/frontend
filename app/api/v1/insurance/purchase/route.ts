import { NextResponse } from "next/server";
import pool from "@/app/lib/db";
import { requireApiAuth, apiErrorResponse } from "@/app/lib/apiAuth";
import { parseInsuranceRequest } from "@/app/lib/insuranceRequest";
import { createInsuranceBookingRecord } from "@/app/lib/createInsuranceBooking";
import { sendInsuranceConfirmation } from "@/app/lib/sendInsuranceConfirmation";
import { issueInsurancePolicyIfEnabled } from "@/app/lib/issueInsurancePolicy";
import { chargeWallet, InsufficientFundsError } from "@/app/lib/wallet";

/* Pays for a travel insurance policy out of the corporate's Credit Pool (Main Balance first, then
 * OD — see app/lib/wallet.ts), then records the policy via the shared createInsuranceBookingRecord
 * helper (insurance_bookings / _travellers / _payments). */
export async function POST(request: Request) {
  try {
    const session = await requireApiAuth(request);

    const input = parseInsuranceRequest(await request.json().catch(() => null));
    if (!input) {
      return NextResponse.json({ error: "Invalid insurance purchase details" }, { status: 400 });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
      const { ref, bookingId } = await createInsuranceBookingRecord(conn, input, {
        createdByName: session.name,
        paymentMode: "Creditpool",
        transactionId: `CREDITPOOL-${stamp}`,
      });

      try {
        await chargeWallet(conn, session.userId, input.amount, {
          bookingId: ref,
          description: `Insurance Policy Deduction - Ref: ${ref}`,
          kind: "insurance",
        });
      } catch (err) {
        if (err instanceof InsufficientFundsError) {
          await conn.rollback();
          return NextResponse.json({ error: "Insufficient Credit Pool Balance" }, { status: 400 });
        }
        throw err;
      }

      await conn.commit();

      const policyNumber = await issueInsurancePolicyIfEnabled(input, bookingId, ref);
      await sendInsuranceConfirmation(ref, input, session.name);

      return NextResponse.json({ ref, policyNumber });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    return apiErrorResponse(err);
  }
}
