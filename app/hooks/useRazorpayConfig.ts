'use client';
import { useEffect, useState } from 'react';

export interface RazorpayConfig {
  enabled: boolean;
  keyId: string;
  currency: string;
  companyName: string;
  themeColor: string;
  logo: string;
}

// Checkout branding (company name, logo, theme color) for the Razorpay payment popup, sourced
// from system_settings via /api/payments/razorpay/config so it stays in sync with the same
// company_name / app_branding_logo_url / app_branding_primary_color settings used elsewhere,
// instead of each checkout page hardcoding its own copy.
export function useRazorpayConfig() {
  const [config, setConfig] = useState<RazorpayConfig | null>(null);

  useEffect(() => {
    fetch('/api/payments/razorpay/config')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setConfig(data); })
      .catch(() => {});
  }, []);

  return config;
}
