import pool from "@/app/lib/db";
import { isSystemSettingEnabled } from "@/app/lib/systemSettings";
import { issueBajajPolicy, destToAreaPlan, toBajajDate, type BajajIssuePolicyTraveller } from "@/app/lib/bajajTravelApi";
import type { InsuranceRequestInput } from "@/app/lib/insuranceRequest";

const AUTO_ISSUE_SETTING_KEY = "insurance_auto_issue_policy";

function ageFromDob(iso: string): number {
  const birth = new Date(iso);
  if (Number.isNaN(birth.getTime())) return 30;
  return Math.max(0, Math.floor((Date.now() - birth.getTime()) / (365.25 * 86400000)));
}

// Traveller forms only collect a title (Mr/Mrs/Ms/Dr/Master/Miss), not a dedicated gender field —
// Bajaj's issuepolicy webservice requires "sex" per traveller, so it's inferred from the title.
// "Dr" has no gender signal; defaults to "M" for lack of any better source.
function sexFromTitle(title: string): "M" | "F" {
  return title === "Mrs" || title === "Ms" || title === "Miss" ? "F" : "M";
}

/* Issues a real Bajaj policy right after a successful insurance payment — but only when the
 * `insurance_auto_issue_policy` row in system_settings has status = 1. Off by default: this hits
 * Bajaj's real issuepolicy webservice and should only be switched on once the integration has been
 * verified end-to-end.
 *
 * Sends exactly the travellers already collected for this purchase (`input.travellers`) — 1 for
 * Individual/Annual Multitrip, N for Family Floater — there's no separate "insurance type" field
 * in Bajaj's payload; the traveller count/details in familyparamlist are what convey that.
 *
 * Never throws — the customer has already been charged and the internal booking record already
 * exists by the time this runs, so a Bajaj-side failure here is logged and swallowed rather than
 * surfaced as a purchase failure. On success, backfills the booking's policy_number with whatever
 * reference Bajaj actually returns, and returns that same number so the caller can show/email it
 * right away instead of re-reading the DB. Falls back to returning the internal `ref` whenever
 * issuance is off, skipped, or fails — callers can display that either way. */
export async function issueInsurancePolicyIfEnabled(
  input: InsuranceRequestInput,
  bookingId: number,
  ref: string
): Promise<string> {
  try {
    const enabled = await isSystemSettingEnabled(AUTO_ISSUE_SETTING_KEY);
    if (!enabled) return ref;

    const fromDate = toBajajDate(input.dep);
    const toDate = toBajajDate(input.ret);
    if (!fromDate || !toDate) {
      console.error(`issueInsurancePolicy: invalid dep/ret for booking ${ref}, skipping issuance`);
      return ref;
    }

    if (input.travellers.length === 0) {
      console.error(`issueInsurancePolicy: no travellers on booking ${ref}, skipping issuance`);
      return ref;
    }

    // Same lead-traveller pick as createInsuranceBookingRecord — the SELF traveller (or the
    // first one, if none is explicitly marked) stands in for the proposer's identity fields and
    // supplies the nominee, since the proposer form itself only collects contact/address details.
    const leadRaw = input.travellers.find(t => t.relationship === "SELF") ?? input.travellers[0];
    const nomineeName = [leadRaw.nomineeFirst, leadRaw.nomineeLast].filter(Boolean).join(" ");

    const travellers: BajajIssuePolicyTraveller[] = input.travellers.map(t => ({
      firstName: t.firstName,
      lastName: t.lastName,
      dob: toBajajDate(t.dob) || fromDate,
      age: ageFromDob(t.dob),
      sex: sexFromTitle(t.title),
      passport: t.passport,
      relationship: t.relationship || "SELF",
    }));

    const result = await issueBajajPolicy({
      travelPlan: input.planName,
      areaPlan: destToAreaPlan(input.dest),
      fromDate,
      toDate,
      totalPremium: input.amount,
      nomineeName,
      proposer: {
        firstName: leadRaw.firstName,
        lastName: leadRaw.lastName,
        dob: toBajajDate(leadRaw.dob) || fromDate,
        sex: sexFromTitle(leadRaw.title),
        email: input.proposer.email,
        mobile: input.proposer.mobile,
        address1: input.proposer.address1,
        address2: input.proposer.address2,
        city: input.proposer.city,
        state: input.proposer.state,
        pincode: input.proposer.pincode,
        gst: input.proposer.gst,
      },
      travellers,
    });

    // Store the exact request/response exchanged with Bajaj either way (success or failure) —
    // policy_number only overwrites the existing value when Bajaj actually returned one.
    await pool.query(
      `UPDATE insurance_bookings
       SET json_req_data = ?, json_res_data = ?, policy_number = COALESCE(NULLIF(?, ''), policy_number)
       WHERE id = ?`,
      [JSON.stringify(result.requestBody), JSON.stringify(result.raw), result.policyNumber, bookingId]
    );

    if (result.error) {
      console.error(`issueInsurancePolicy: Bajaj issuepolicy failed for booking ${ref}: ${result.error}`);
    } else if (!result.policyNumber) {
      console.error(`issueInsurancePolicy: Bajaj returned no policy number for booking ${ref}`, result.raw);
    }

    return result.policyNumber || ref;
  } catch (err) {
    console.error(`issueInsurancePolicy failed for booking ${ref}`, err);
    return ref;
  }
}
