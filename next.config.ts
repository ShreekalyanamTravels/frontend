import type { NextConfig } from "next";

// Origins this app loads scripts/styles/frames from — Razorpay checkout, Google Fonts, Google
// reCAPTCHA, plus GA4/GTM/Clarity/Facebook Pixel (see app/components/Analytics.tsx — those only
// actually load when their env var is set, but are allowlisted here so enabling one later doesn't
// also require a CSP change). Kept as an explicit allowlist rather than a wildcard.
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "img-src 'self' data: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://www.google.com https://www.gstatic.com " +
    "https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms " +
    "https://connect.facebook.net",
  "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com " +
    "https://www.google-analytics.com https://www.clarity.ms https://connect.facebook.net",
  "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://www.google.com",
].join("; ");

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: CSP },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["mysql2", "@react-pdf/renderer"],
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
