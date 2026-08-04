export const SUPPLIER_COLORS: Record<string, string> = {
  ICICI: '#c0392b',
  BAJAJ: '#154690',
  TATA:  '#0059a8',
  CARE:  '#e85c0d',
  II:    '#1a3c6e',
};

export const SUPPLIER_LABELS: Record<string, { line1: string; line2: string }> = {
  ICICI: { line1: 'ICICI', line2: 'Lombard' },
  BAJAJ: { line1: 'BAJAJ', line2: 'Allianz' },
  TATA:  { line1: 'TATA',  line2: 'AIG' },
  CARE:  { line1: 'Care',  line2: 'Health' },
  II:    { line1: 'Indus', line2: 'Ind' },
};

export type InsurancePlan = {
  id: string;
  supplier: string;
  name: string;
  coverage: number;
  premium: number;
  logo: string;
};

export const ALL_PLANS: InsurancePlan[] = [
  { id: 'ic1',  supplier: 'ICICI Lombard',  name: 'ICICI 50K',                   coverage: 50000,   premium: 512,  logo: 'ICICI' },
  { id: 'bj1',  supplier: 'Bajaj Allianz',  name: 'Travel Prime Holiday Silver',  coverage: 50000,   premium: 539,  logo: 'BAJAJ' },
  { id: 'bj2',  supplier: 'Bajaj Allianz',  name: 'Travel Prime Holiday Gold',    coverage: 200000,  premium: 685,  logo: 'BAJAJ' },
  { id: 'ta1',  supplier: 'TATA AIG',       name: 'MediClaim Plus 250K',          coverage: 250000,  premium: 749,  logo: 'TATA'  },
  { id: 'ca1',  supplier: 'Care',           name: 'Care Travel Silver',           coverage: 50000,   premium: 599,  logo: 'CARE'  },
  { id: 'ic2',  supplier: 'ICICI Lombard',  name: 'ICICI 250K',                   coverage: 250000,  premium: 820,  logo: 'ICICI' },
  { id: 'bj3',  supplier: 'Bajaj Allianz',  name: 'Travel Prime Holiday Platinum',coverage: 500000,  premium: 1099, logo: 'BAJAJ' },
  { id: 'ii1',  supplier: 'IndusInd',       name: 'IndusInd Secure Plus',         coverage: 50000,   premium: 625,  logo: 'II'    },
  { id: 'ta2',  supplier: 'TATA AIG',       name: 'MediClaim Elite 500K',         coverage: 500000,  premium: 1250, logo: 'TATA'  },
  { id: 'ca2',  supplier: 'Care',           name: 'Care Travel Gold',             coverage: 250000,  premium: 899,  logo: 'CARE'  },
  { id: 'ic3',  supplier: 'ICICI Lombard',  name: 'ICICI Platinum 500K',          coverage: 500000,  premium: 1180, logo: 'ICICI' },
  { id: 'ii2',  supplier: 'IndusInd',       name: 'IndusInd Premium 250K',        coverage: 250000,  premium: 780,  logo: 'II'    },
  { id: 'ta3',  supplier: 'TATA AIG',       name: 'MediClaim Supreme 1M',         coverage: 1000000, premium: 1599, logo: 'TATA'  },
  { id: 'bj4',  supplier: 'Bajaj Allianz',  name: 'Global Travel Executive',      coverage: 1000000, premium: 1750, logo: 'BAJAJ' },
  { id: 'ic4',  supplier: 'ICICI Lombard',  name: 'ICICI Global Secure 1M',       coverage: 1000000, premium: 1690, logo: 'ICICI' },
];

export type ProposerForm = {
  nationality: string; mobile: string; email: string;
  address1: string; address2: string;
  state: string; district: string; city: string; pincode: string; gst: string;
};

export type TravellerForm = {
  id: number; title: string; firstName: string; lastName: string; dob: string;
  passport: string; relationship: string; nationality: string;
  nomineeFirst: string; nomineeLast: string;
};

export function getPlanById(id: string): InsurancePlan | undefined {
  return ALL_PLANS.find(p => p.id === id);
}

/** Returns supplier brand color; falls back to orange */
export function supplierColor(logo: string): string {
  return SUPPLIER_COLORS[logo] ?? '#f07820';
}

/** Coverage breakdown items derived from the plan's sum-assured */
export function coverageBreakdown(coverage: number, premium: number) {
  return [
    { label: 'Medical Expenses',  amount: fmtUSD(coverage) },
    { label: 'Trip Cancellation', amount: fmtUSD(Math.round(coverage * 0.1)) },
    { label: 'Baggage Loss',      amount: fmtUSD(Math.round(coverage * 0.04)) },
    { label: 'Personal Accident', amount: fmtUSD(Math.round(coverage * 0.5)) },
    { label: 'Trip Delay',        amount: '₹' + (premium > 700 ? '20,000' : '10,000') },
    { label: 'Passport Loss',     amount: '₹' + (premium > 1000 ? '30,000' : '15,000') },
  ];
}

function fmtUSD(n: number) {
  return '$' + n.toLocaleString('en-US');
}
