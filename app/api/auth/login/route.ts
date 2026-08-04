import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";
import { createSessionToken, SESSION_COOKIE } from "@/app/lib/auth";
import { verifyRecaptcha } from "@/app/lib/recaptcha";

interface UserRow extends RowDataPacket {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  password: string;
  status: "Active" | "Inactive";
}

export async function POST(request: Request) {
  const { email, password, recaptchaToken } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  if (!(await verifyRecaptcha(recaptchaToken))) {
    return NextResponse.json({ error: "reCAPTCHA verification failed. Please try again." }, { status: 400 });
  }

  const [rows] = await pool.query<UserRow[]>(
    "SELECT id, first_name, last_name, email, password, status FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  const user = rows[0];

  if (!user || user.status !== "Active" || !(await bcrypt.compare(password, user.password))) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
  const corporateId = String(user.id);
  const token = await createSessionToken({
    userId: user.id,
    email: user.email,
    name,
    corporateId,
  });

  const response = NextResponse.json({
    user: { id: user.id, email: user.email, name, corporateId },
  });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
