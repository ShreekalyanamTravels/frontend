import type { Metadata } from "next";

// The entire corporate app is an authenticated booking dashboard holding customer/financial
// data — it must never be indexed, regardless of what any individual page under it does.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function CorporateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
