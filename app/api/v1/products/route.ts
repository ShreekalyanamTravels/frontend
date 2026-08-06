import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";

interface ProductRow extends RowDataPacket {
  id: number;
  name: string;
  status: "active" | "inactive";
  availability: "live" | "coming_soon";
}

const querySchema = z.object({
  status: z.enum(["active", "inactive"]).optional(),
});

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse({ status: request.nextUrl.searchParams.get("status") ?? undefined });
  if (!parsed.success) {
    return NextResponse.json({ error: "status must be 'active' or 'inactive'" }, { status: 400 });
  }
  const { status } = parsed.data;

  const [rows] = await pool.query<ProductRow[]>(
    status ? "SELECT id, name, status, availability FROM products WHERE status = ?" : "SELECT id, name, status, availability FROM products",
    status ? [status] : []
  );

  return NextResponse.json({
    products: rows.map(r => ({ id: r.id, name: r.name, status: r.status, availability: r.availability })),
  });
}
