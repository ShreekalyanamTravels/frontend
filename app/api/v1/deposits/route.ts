import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";
import { requireApiAuth, apiErrorResponse, ApiError } from "@/app/lib/apiAuth";

interface DepositRow extends RowDataPacket {
  id: number;
  payment_type: string;
  bank_id: number | null;
  cheque_bank_name: string | null;
  account_number: string | null;
  amount: string;
  status: "pending" | "approved" | "rejected";
  remarks: string | null;
  admin_remarks: string | null;
  transaction_date: string;
  created_at: string;
}

interface BankRow extends RowDataPacket {
  bank_name: string | null;
}

interface CompanyBankRow extends RowDataPacket {
  id: number;
  account_holder_name: string | null;
  bank_name: string | null;
  account_no: string | null;
  ifsc_code: string | null;
  branch: string | null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const querySchema = z.object({
  from: z.string().regex(DATE_RE).optional(),
  to: z.string().regex(DATE_RE).optional(),
});

export async function GET(request: Request) {
  try {
    const session = await requireApiAuth(request);

    const { searchParams } = new URL(request.url);
    const parsedQuery = querySchema.safeParse({
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });
    if (!parsedQuery.success) {
      return NextResponse.json({ error: "from/to must be YYYY-MM-DD" }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const from = parsedQuery.data.from || firstOfMonth;
    const to = parsedQuery.data.to || today;

    const [rows] = await pool.query<DepositRow[]>(
      `SELECT id, payment_type, bank_id, cheque_bank_name, account_number, amount, status,
              remarks, admin_remarks, transaction_date, created_at
       FROM deposits
       WHERE user_id = ? AND transaction_date BETWEEN ? AND ?
       ORDER BY created_at DESC`,
      [session.userId, from, to]
    );

    const bankIds = [...new Set(rows.map(r => r.bank_id).filter((v): v is number => v != null))];
    const bankNames = new Map<number, string>();
    if (bankIds.length > 0) {
      const [banks] = await pool.query<(BankRow & { id: number })[]>(
        `SELECT id, bank_name FROM banks WHERE id IN (${bankIds.map(() => "?").join(",")})`,
        bankIds
      );
      for (const b of banks) bankNames.set(b.id, b.bank_name ?? "");
    }

    const [companyBankRows] = await pool.query<CompanyBankRow[]>(
      "SELECT id, account_holder_name, bank_name, account_no, ifsc_code, branch FROM banks ORDER BY id ASC"
    );

    return NextResponse.json({
      deposits: rows.map(r => ({
        id: r.id,
        paymentType: r.payment_type,
        bankLabel: r.bank_id
          ? [bankNames.get(r.bank_id), r.account_number].filter(Boolean).join("\n")
          : r.cheque_bank_name
          ? [r.cheque_bank_name, r.account_number].filter(Boolean).join("\n")
          : null,
        amount: Number(r.amount),
        status: r.status,
        remarks: r.admin_remarks || r.remarks || null,
        postedDate: r.created_at,
      })),
      banks: companyBankRows,
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

const ALLOWED_SLIP_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);
const MAX_SLIP_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request) {
  try {
    const session = await requireApiAuth(request);

    const form = await request.formData();
    const paymentType = String(form.get("paymentType") ?? "");
    const amount = Number(form.get("amount"));

    if (!paymentType || !amount || amount <= 0) {
      return NextResponse.json({ error: "Payment type and a valid amount are required" }, { status: 400 });
    }

    const str = (key: string) => {
      const v = form.get(key);
      return typeof v === "string" && v.trim() ? v.trim() : null;
    };

    const bankId = str("bankId") ? Number(str("bankId")) : null;
    const transactionDateRaw = str("transactionDate");
    if (transactionDateRaw && !DATE_RE.test(transactionDateRaw)) {
      return NextResponse.json({ error: "transactionDate must be YYYY-MM-DD" }, { status: 400 });
    }
    const transactionDate = transactionDateRaw || new Date().toISOString().slice(0, 10);

    let remarks = str("remarks");
    const vpa = str("vpa");
    if (vpa) remarks = remarks ? `${remarks} (UPI ID: ${vpa})` : `UPI ID: ${vpa}`;

    let slipPath: string | null = null;
    const file = form.get("slip");
    if (file instanceof File && file.size > 0) {
      if (!ALLOWED_SLIP_TYPES.has(file.type)) {
        throw new ApiError(400, "Slip must be a JPEG, PNG, or PDF file");
      }
      if (file.size > MAX_SLIP_SIZE) {
        throw new ApiError(400, "Slip file must be 5 MB or smaller");
      }

      const uploadDir = path.join(process.cwd(), "public", "uploads", "deposit-slips");
      await mkdir(uploadDir, { recursive: true });
      const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(path.join(uploadDir, safeName), buffer);
      slipPath = `/uploads/deposit-slips/${safeName}`;
    }

    await pool.query(
      `INSERT INTO deposits
        (user_id, payment_type, payment_gateway, bank_id, transaction_id, amount, convenience_fee, total_paid,
         transaction_date, auth_code, tid, rrn_number, account_number, holder_name, atm_id,
         cheque_number, cheque_bank_name, branch_name, remarks, slip_path, status, is_online)
       VALUES (?, ?, NULL, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)`,
      [
        session.userId,
        paymentType,
        bankId,
        str("transactionId"),
        amount,
        amount,
        transactionDate,
        str("authCode"),
        str("tid"),
        str("rrn"),
        str("accountNumber"),
        str("holderName"),
        str("atmId"),
        str("chequeNumber"),
        str("chequeBankName"),
        str("branchName"),
        remarks,
        slipPath,
      ]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
