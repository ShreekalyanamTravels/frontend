'use client';
import { createContext, useContext } from 'react';

// Populated server-side in CorporateLayout so client components like CorpFooter render the
// real company name on first paint instead of a hardcoded default that gets swapped in after
// a client-side fetch resolves.
const CompanyNameContext = createContext('Shree Kalyanam');

export function CompanyNameProvider({ value, children }: { value: string; children: React.ReactNode }) {
  return <CompanyNameContext.Provider value={value}>{children}</CompanyNameContext.Provider>;
}

export function useCompanyName() {
  return useContext(CompanyNameContext);
}
