import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";

// India — the only country this corporate portal's GST details apply to.
export const INDIA_COUNTRY_ID = "105";

// Mirrors app/lib/textSanitize.ts's client-side character filters — the client strips disallowed
// characters as the user types, but a request could still arrive without going through that UI,
// so every field is re-validated here against the exact same allowed character sets.
const RE_COMPANY_NAME = /^[a-zA-Z0-9 &-]+$/;
const RE_ALPHANUMERIC = /^[a-zA-Z0-9]+$/;
const RE_DIGITS = /^[0-9]+$/;
const RE_ADDRESS = /^[a-zA-Z0-9 .\-/#]+$/;

export interface GstFields {
  companyName: string; registrationNo: string; gstNumber: string;
  pincode: string; stateId: number | null; address: string;
}

/* Validates that every field is present (all fields mandatory) and, where a field disallows
 * special characters, that it actually matches that character set. Returns an error string, or
 * null when the payload is valid. */
export function validateGstFields(f: GstFields): string | null {
  if (!f.companyName || !f.registrationNo || !f.gstNumber || !f.pincode || !f.stateId || !f.address) {
    return "All fields are required";
  }
  if (!RE_COMPANY_NAME.test(f.companyName)) return "Company Name contains special characters that aren't allowed";
  if (!RE_ALPHANUMERIC.test(f.registrationNo)) return "Registration No must be alphanumeric only";
  if (!RE_ALPHANUMERIC.test(f.gstNumber)) return "GST must be alphanumeric only";
  if (!RE_DIGITS.test(f.pincode)) return "Pin Code must contain digits only";
  if (!RE_ADDRESS.test(f.address)) return "Address contains special characters that aren't allowed";
  return null;
}

// gst_number carries a UNIQUE constraint at the DB level (uq_corporate_gsts_gst_number) — this
// pre-check exists just to turn that into a friendly message instead of a raw constraint-error
// response; isDuplicateGstError below is the actual safety net for the race-condition case where
// two requests for the same GST land between this check and the write.
export async function findDuplicateGstOwner(gstNumber: string, excludeId?: number): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    excludeId
      ? "SELECT id FROM corporate_gsts WHERE gst_number = ? AND id != ? LIMIT 1"
      : "SELECT id FROM corporate_gsts WHERE gst_number = ? LIMIT 1",
    excludeId ? [gstNumber, excludeId] : [gstNumber]
  );
  return rows.length > 0;
}

export function isDuplicateGstError(err: unknown): boolean {
  return !!err && typeof err === "object" && "code" in err && (err as { code: string }).code === "ER_DUP_ENTRY";
}

export const DUPLICATE_GST_MESSAGE = "This GST number is already saved. Duplicate GST numbers aren't allowed.";

export function parseGstBody(body: unknown): GstFields {
  const b = body as Record<string, unknown> | null;
  return {
    companyName: typeof b?.companyName === "string" ? b.companyName.trim() : "",
    registrationNo: typeof b?.registrationNo === "string" ? b.registrationNo.trim() : "",
    gstNumber: typeof b?.gstNumber === "string" ? b.gstNumber.trim() : "",
    pincode: typeof b?.pincode === "string" ? b.pincode.trim() : "",
    stateId: Number(b?.stateId) || null,
    address: typeof b?.address === "string" ? b.address.trim() : "",
  };
}
