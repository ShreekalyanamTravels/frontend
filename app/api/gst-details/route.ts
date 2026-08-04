import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import pool from "@/app/lib/db";
import { verifySessionToken, SESSION_COOKIE } from "@/app/lib/auth";

interface GstRow extends RowDataPacket {
  id: number;
  company_name: string | null;
  registration_no: string | null;
  gst_number: string | null;
  pincode: string | null;
  state: number | null;
  state_name: string | null;
  address: string | null;
  created_at: string;
}

interface StateRow extends RowDataPacket {
  id: number;
  state_name: string;
}

async function requireSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? await verifySessionToken(token) : null;
}

// India — the only country this corporate portal's GST details apply to.
const INDIA_COUNTRY_ID = "105";

// Mirrors app/lib/textSanitize.ts's client-side character filters — the client strips disallowed
// characters as the user types, but a request could still arrive without going through that UI,
// so every field is re-validated here against the exact same allowed character sets.
const RE_COMPANY_NAME = /^[a-zA-Z0-9 &-]+$/;
const RE_ALPHANUMERIC = /^[a-zA-Z0-9]+$/;
const RE_DIGITS = /^[0-9]+$/;
const RE_ADDRESS = /^[a-zA-Z0-9 .\-/#]+$/;

interface GstFields {
  companyName: string; registrationNo: string; gstNumber: string;
  pincode: string; stateId: number | null; address: string;
}

/* Validates that every field is present and required all fields to be mandatory) and, where a
 * field disallows special characters, that it actually matches that character set. Returns an
 * error string, or null when the payload is valid. */
function validateGstFields(f: GstFields): string | null {
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
async function findDuplicateGstOwner(gstNumber: string, excludeId?: number): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    excludeId
      ? "SELECT id FROM corporate_gsts WHERE gst_number = ? AND id != ? LIMIT 1"
      : "SELECT id FROM corporate_gsts WHERE gst_number = ? LIMIT 1",
    excludeId ? [gstNumber, excludeId] : [gstNumber]
  );
  return rows.length > 0;
}

function isDuplicateGstError(err: unknown): boolean {
  return !!err && typeof err === "object" && "code" in err && (err as { code: string }).code === "ER_DUP_ENTRY";
}

const DUPLICATE_GST_MESSAGE = "This GST number is already saved. Duplicate GST numbers aren't allowed.";

function parseGstBody(body: unknown): GstFields {
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

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [gsts] = await pool.query<GstRow[]>(
    `SELECT g.id, g.company_name, g.registration_no, g.gst_number, g.pincode, g.state,
            s.state_name, g.address, g.created_at
     FROM corporate_gsts g
     LEFT JOIN state s ON s.id = g.state
     WHERE g.user_id = ?
     ORDER BY g.id DESC`,
    [session.userId]
  );

  const [states] = await pool.query<StateRow[]>(
    "SELECT id, state_name FROM state WHERE country_id = ? ORDER BY state_name ASC",
    [INDIA_COUNTRY_ID]
  );

  return NextResponse.json({
    gsts: gsts.map(g => ({
      id: g.id,
      companyName: g.company_name,
      registrationNo: g.registration_no,
      gstNumber: g.gst_number,
      pincode: g.pincode,
      stateId: g.state,
      stateName: g.state_name,
      address: g.address,
      createdAt: g.created_at,
    })),
    states: states.map(s => ({ id: s.id, name: s.state_name })),
  });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const fields = parseGstBody(body);

  const validationError = validateGstFields(fields);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  if (await findDuplicateGstOwner(fields.gstNumber)) {
    return NextResponse.json({ error: DUPLICATE_GST_MESSAGE }, { status: 409 });
  }

  try {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO corporate_gsts
        (user_id, corporate_id, company_name, registration_no, gst_number, pincode, state, address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [session.userId, session.userId, fields.companyName, fields.registrationNo, fields.gstNumber,
        fields.pincode, fields.stateId, fields.address]
    );
    return NextResponse.json({ id: result.insertId });
  } catch (err) {
    if (isDuplicateGstError(err)) {
      return NextResponse.json({ error: DUPLICATE_GST_MESSAGE }, { status: 409 });
    }
    throw err;
  }
}

export async function PUT(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const id = Number((body as Record<string, unknown> | null)?.id);
  const fields = parseGstBody(body);

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const validationError = validateGstFields(fields);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  if (await findDuplicateGstOwner(fields.gstNumber, id)) {
    return NextResponse.json({ error: DUPLICATE_GST_MESSAGE }, { status: 409 });
  }

  try {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE corporate_gsts
       SET company_name = ?, registration_no = ?, gst_number = ?, pincode = ?, state = ?, address = ?
       WHERE id = ? AND user_id = ?`,
      [fields.companyName, fields.registrationNo, fields.gstNumber, fields.pincode, fields.stateId, fields.address, id, session.userId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "GST record not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isDuplicateGstError(err)) {
      return NextResponse.json({ error: DUPLICATE_GST_MESSAGE }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  await pool.query("DELETE FROM corporate_gsts WHERE id = ? AND user_id = ?", [id, session.userId]);
  return NextResponse.json({ ok: true });
}
