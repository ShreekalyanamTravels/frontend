import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";

interface ModuleSettingRow extends RowDataPacket {
  email_id: string;
  password: string;
  apiKey: string;
  Host: string;
  yatra_api_url: string;
  is_automation: number;
  gst_percentage: number;
}

const TTL_MS = 6 * 60 * 60 * 1000;

declare global {
  // eslint-disable-next-line no-var
  var _moduleSettingCache: { row: ModuleSettingRow; expires: number } | undefined;
}

export async function moduleSetting(): Promise<ModuleSettingRow> {
  const cached = global._moduleSettingCache;
  if (cached && cached.expires > Date.now()) {
    return cached.row;
  }

  const [rows] = await pool.query<ModuleSettingRow[]>(
    "SELECT email_id, password, apiKey, Host, yatra_api_url, is_automation, gst_percentage FROM module_setting ORDER BY id LIMIT 1"
  );
  const row = rows[0];
  if (!row) {
    throw new Error("module_setting has no rows");
  }

  global._moduleSettingCache = { row, expires: Date.now() + TTL_MS };
  return row;
}
