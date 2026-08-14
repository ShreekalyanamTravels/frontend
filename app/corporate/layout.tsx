import type { Metadata } from "next";
import { getSystemSettingValue } from "@/app/lib/systemSettings";
import { CompanyNameProvider } from "./components/CompanyNameContext";

// The entire corporate app is an authenticated booking dashboard holding customer/financial
// data — it must never be indexed, regardless of what any individual page under it does.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function CorporateLayout({ children }: { children: React.ReactNode }) {
  const companyName = (await getSystemSettingValue('company_name')) ?? 'Shree Kalyanam';

  return <CompanyNameProvider value={companyName}>{children}</CompanyNameProvider>;
}
