import { NextResponse } from "next/server";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import pool from "@/app/lib/db";
import { requireApiAuth, apiErrorResponse } from "@/app/lib/apiAuth";
import {
  INDIA_COUNTRY_ID, validateGstFields, findDuplicateGstOwner,
  isDuplicateGstError, DUPLICATE_GST_MESSAGE, parseGstBody,
} from "@/app/lib/gstDetails";

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

export async function GET(request: Request) {
  try {
    const session = await requireApiAuth(request);

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
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiAuth(request);

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
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireApiAuth(request);

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
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireApiAuth(request);

    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await pool.query("DELETE FROM corporate_gsts WHERE id = ? AND user_id = ?", [id, session.userId]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
