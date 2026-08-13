import { NextResponse } from "next/server";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import { Expo } from "expo-server-sdk";
import pool from "@/app/lib/db";
import { requireApiAuth, apiErrorResponse, ApiError } from "@/app/lib/apiAuth";

const bodySchema = z.object({
  title: z.string().max(255).optional(),
  body: z.string().max(1000).optional(),
});

interface UserRow extends RowDataPacket {
  push_token: string | null;
}

export async function POST(request: Request) {
  try {
    const session = await requireApiAuth(request);
    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" }, { status: 400 });
    }

    const [rows] = await pool.query<UserRow[]>("SELECT push_token FROM users WHERE id = ? LIMIT 1", [session.userId]);
    const pushToken = rows[0]?.push_token;
    if (!pushToken || !Expo.isExpoPushToken(pushToken)) {
      throw new ApiError(400, "No registered push token for this user");
    }

    const expo = new Expo();
    const tickets = await expo.sendPushNotificationsAsync([
      {
        to: pushToken,
        title: parsed.data.title ?? "Shree Kalyanam Travels",
        body: parsed.data.body ?? "This is a test notification.",
      },
    ]);

    for (const ticket of tickets) {
      if (ticket.status === "error") {
        console.error("Push send error:", ticket.message, ticket.details);
      }
    }

    return NextResponse.json({ ok: true, tickets });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
