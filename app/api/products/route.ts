import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";

interface ProductRow extends RowDataPacket {
  id: number;
  name: string;
  status: "active" | "inactive";
  availability: "live" | "coming_soon";
}

export async function GET() {
  const [rows] = await pool.query<ProductRow[]>(
    "SELECT id, name, status, availability FROM products"
  );
  return NextResponse.json({
    products: rows.map(r => ({ id: r.id, name: r.name, status: r.status, availability: r.availability })),
  });
}
