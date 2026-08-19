import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";

export interface SystemSettingRow extends RowDataPacket {
  id: number;
  key: string;
  value: string | null;
  status: number;
  description: string | null;
}

/* Reusable single-row lookup for the `system_settings` table, keyed by `key` — every
 * setting check in the app should go through this instead of writing its own query, same as
 * moduleSetting() is the one place module_setting is read from. Queried fresh every call (no
 * cache) since these are ops toggles meant to take effect immediately, and they're only checked
 * at low-frequency action points (e.g. once per insurance purchase), not on any hot path. */
export async function getSystemSetting(key: string): Promise<SystemSettingRow | null> {
  try {
    const [rows] = await pool.query<SystemSettingRow[]>(
      "SELECT id, `key`, value, status, description FROM system_settings WHERE `key` = ? LIMIT 1",
      [key]
    );
    return rows[0] ?? null;
  } catch (err) {
    // Swallowed rather than thrown: callers like the marketing/corporate layouts call this
    // during static-page prerendering at `next build` time, where the DB may not be reachable
    // (build environment without DB network access/credentials) — a connection failure here
    // must not fail the whole build. Callers fall back to a hardcoded default on null.
    console.error(`getSystemSetting(${key}) failed:`, err);
    return null;
  }
}

/* Convenience wrapper over getSystemSetting() for the common on/off (status 0/1) check. */
export async function isSystemSettingEnabled(key: string): Promise<boolean> {
  const row = await getSystemSetting(key);
  return row?.status === 1;
}

/* Convenience wrapper over getSystemSetting() for reading a setting's stored `value` — e.g. a
 * URL (app_icon, app_logo) or free text (company_name). Returns null if the key isn't found or
 * has no value set. */
export async function getSystemSettingValue(key: string): Promise<string | null> {
  const row = await getSystemSetting(key);
  return row?.value ?? null;
}

/* Batch form of getSystemSetting() — one query for several keys instead of one round trip per
 * key, for callers (like the app-config endpoint) that need a whole group of settings at once.
 * Missing keys are simply absent from the returned map; same swallow-and-log-null behavior as
 * getSystemSetting() on query failure. */
export async function getSystemSettings(keys: string[]): Promise<Map<string, SystemSettingRow>> {
  try {
    const [rows] = await pool.query<SystemSettingRow[]>(
      "SELECT id, `key`, value, status, description FROM system_settings WHERE `key` IN (?)",
      [keys]
    );
    return new Map(rows.map((row) => [row.key, row]));
  } catch (err) {
    console.error(`getSystemSettings(${keys.join(", ")}) failed:`, err);
    return new Map();
  }
}
