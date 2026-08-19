import { NextResponse } from "next/server";
import { getSystemSettings } from "@/app/lib/systemSettings";

// Always read system_settings fresh — maintenanceMode/forceUpdate/feature flags are ops toggles
// meant to take effect immediately, so this must never be statically prerendered or CDN-cached.
export const dynamic = "force-dynamic";

const DEFAULTS = {
  apiBaseUrl: "https://corporate.shreekalyanam.com/api/v1",
  appName: "Shree Kalyanam",
  appIconUrl: "https://corporate.shreekalyanam.com/assets/logo-mark.png",
  branding: {
    logoUrl: "https://corporate.shreekalyanam.com/assets/logo.png",
    loadingLogoUrl: "https://corporate.shreekalyanam.com/assets/logo-mark.png",
    primaryColor: "#e07a3f",
    backgroundColor: "#faf8f4",
  },
  minSupportedVersion: "1.0.0",
  forceUpdate: false,
  maintenanceMode: false,
  featureFlags: {
    otpLogin: true,
    pushNotifications: true,
    walletRecharge: true,
  },
};

const KEYS = [
  "app_api_base_url",
  "app_name",
  "app_icon_url",
  "app_branding_logo_url",
  "app_branding_loading_logo_url",
  "app_branding_primary_color",
  "app_branding_background_color",
  "app_min_supported_version",
  "app_force_update",
  "app_maintenance_mode",
  "app_feature_otp_login",
  "app_feature_push_notifications",
  "app_feature_wallet_recharge",
];

// Public, unauthenticated: basic app configuration (API base URL, branding, update gating,
// feature flags) the mobile app needs on launch, before any user is logged in. Sourced from
// system_settings — text/URL settings read `value`, on/off settings read `status` (0/1) — and
// falls back to DEFAULTS for any key not yet present in the table.
export async function GET() {
  const settings = await getSystemSettings(KEYS);
  const value = (key: string, fallback: string) => settings.get(key)?.value ?? fallback;
  const flag = (key: string, fallback: boolean) => {
    const row = settings.get(key);
    return row ? row.status === 1 : fallback;
  };

  return NextResponse.json(
    {
      apiBaseUrl: value("app_api_base_url", DEFAULTS.apiBaseUrl),
      appName: value("app_name", DEFAULTS.appName),
      appIconUrl: value("app_icon_url", DEFAULTS.appIconUrl),
      branding: {
        logoUrl: value("app_branding_logo_url", DEFAULTS.branding.logoUrl),
        loadingLogoUrl: value("app_branding_loading_logo_url", DEFAULTS.branding.loadingLogoUrl),
        primaryColor: value("app_branding_primary_color", DEFAULTS.branding.primaryColor),
        backgroundColor: value("app_branding_background_color", DEFAULTS.branding.backgroundColor),
      },
      minSupportedVersion: value("app_min_supported_version", DEFAULTS.minSupportedVersion),
      forceUpdate: flag("app_force_update", DEFAULTS.forceUpdate),
      maintenanceMode: flag("app_maintenance_mode", DEFAULTS.maintenanceMode),
      featureFlags: {
        otpLogin: flag("app_feature_otp_login", DEFAULTS.featureFlags.otpLogin),
        pushNotifications: flag("app_feature_push_notifications", DEFAULTS.featureFlags.pushNotifications),
        walletRecharge: flag("app_feature_wallet_recharge", DEFAULTS.featureFlags.walletRecharge),
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
