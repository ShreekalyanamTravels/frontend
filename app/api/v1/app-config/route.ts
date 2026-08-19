import { NextResponse } from "next/server";
import { getSystemSettings } from "@/app/lib/systemSettings";

const DEFAULTS = {
  apiBaseUrl: "https://corporate.shreekalyanam.com/api/v1",
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
  "api_base_url",
  "branding_logo_url",
  "branding_loading_logo_url",
  "branding_primary_color",
  "branding_background_color",
  "min_supported_version",
  "force_update",
  "maintenance_mode",
  "feature_otp_login",
  "feature_push_notifications",
  "feature_wallet_recharge",
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

  return NextResponse.json({
    apiBaseUrl: value("api_base_url", DEFAULTS.apiBaseUrl),
    branding: {
      logoUrl: value("branding_logo_url", DEFAULTS.branding.logoUrl),
      loadingLogoUrl: value("branding_loading_logo_url", DEFAULTS.branding.loadingLogoUrl),
      primaryColor: value("branding_primary_color", DEFAULTS.branding.primaryColor),
      backgroundColor: value("branding_background_color", DEFAULTS.branding.backgroundColor),
    },
    minSupportedVersion: value("min_supported_version", DEFAULTS.minSupportedVersion),
    forceUpdate: flag("force_update", DEFAULTS.forceUpdate),
    maintenanceMode: flag("maintenance_mode", DEFAULTS.maintenanceMode),
    featureFlags: {
      otpLogin: flag("feature_otp_login", DEFAULTS.featureFlags.otpLogin),
      pushNotifications: flag("feature_push_notifications", DEFAULTS.featureFlags.pushNotifications),
      walletRecharge: flag("feature_wallet_recharge", DEFAULTS.featureFlags.walletRecharge),
    },
  });
}
