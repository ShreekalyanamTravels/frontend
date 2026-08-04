import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";

export interface SystemSettingRow extends RowDataPacket {
  id: number;
  setting_key: string;
  status: number;
  description: string | null;
}

/* Reusable single-row lookup for the `system_settings` table, keyed by `setting_key` — every
 * setting check in the app should go through this instead of writing its own query, same as
 * moduleSetting() is the one place module_setting is read from. Queried fresh every call (no
 * cache) since these are ops toggles meant to take effect immediately, and they're only checked
 * at low-frequency action points (e.g. once per insurance purchase), not on any hot path. */
export async function getSystemSetting(key: string): Promise<SystemSettingRow | null> {
  const [rows] = await pool.query<SystemSettingRow[]>(
    "SELECT id, setting_key, status, description FROM system_settings WHERE setting_key = ? LIMIT 1",
    [key]
  );
  return rows[0] ?? null;
}

/* Convenience wrapper over getSystemSetting() for the common on/off (status 0/1) check. */
export async function isSystemSettingEnabled(key: string): Promise<boolean> {
  const row = await getSystemSetting(key);
  return row?.status === 1;
}
