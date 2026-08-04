import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE } from "@/app/lib/seo";
import Analytics from "@/app/components/Analytics";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.baseUrl),
  title: { default: SITE.defaultTitle, template: `%s | ${SITE.name}` },
  description: SITE.defaultDescription,
  authors: [{ name: SITE.name }],
  // app/favicon.ico is auto-served/auto-linked by Next at "/favicon.ico" — no entry needed here.
  // apple-touch-icon.png (180x180) still needs to be added at app/apple-icon.png once a real
  // branded asset exists; Next will pick it up automatically the same way.
  verification: {
    google: process.env.NEXT_PUBLIC_GSC_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_BING_VERIFICATION
      ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_VERIFICATION }
      : undefined,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f07820",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
