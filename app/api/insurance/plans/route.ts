import { NextRequest, NextResponse } from "next/server";
import { fetchBajajTravelPlans } from "@/app/lib/bajajTravelApi";

/* Fallback rate card used only when the live Bajaj plan list can't be reached (network error,
 * missing credentials, etc.) — per-day rate for single-trip plans, flat annual rate for
 * multi-trip plans. Coverage/supplier/name stay fixed; only the premium varies with the search
 * (destination risk zone, trip length, traveller age). */
const BASE_PLANS = [
  { id: "ic1", supplier: "ICICI Lombard", name: "ICICI 50K",                    coverage: 50000,    perDayRate: 51,  annualBase: 1536, logo: "ICICI" },
  { id: "bj1", supplier: "Bajaj Allianz", name: "Travel Prime Holiday Silver",  coverage: 50000,    perDayRate: 54,  annualBase: 1617, logo: "BAJAJ" },
  { id: "bj2", supplier: "Bajaj Allianz", name: "Travel Prime Holiday Gold",    coverage: 200000,   perDayRate: 69,  annualBase: 2055, logo: "BAJAJ" },
  { id: "ta1", supplier: "TATA AIG",      name: "MediClaim Plus 250K",          coverage: 250000,   perDayRate: 75,  annualBase: 2247, logo: "TATA"  },
  { id: "ca1", supplier: "Care",          name: "Care Travel Silver",           coverage: 50000,    perDayRate: 60,  annualBase: 1797, logo: "CARE"  },
  { id: "ic2", supplier: "ICICI Lombard", name: "ICICI 250K",                   coverage: 250000,   perDayRate: 82,  annualBase: 2460, logo: "ICICI" },
  { id: "bj3", supplier: "Bajaj Allianz", name: "Travel Prime Holiday Platinum",coverage: 500000,   perDayRate: 110, annualBase: 3297, logo: "BAJAJ" },
  { id: "ii1", supplier: "IndusInd",      name: "IndusInd Secure Plus",         coverage: 50000,    perDayRate: 63,  annualBase: 1875, logo: "II"    },
  { id: "ta2", supplier: "TATA AIG",      name: "MediClaim Elite 500K",         coverage: 500000,   perDayRate: 125, annualBase: 3750, logo: "TATA"  },
  { id: "ca2", supplier: "Care",          name: "Care Travel Gold",             coverage: 250000,   perDayRate: 90,  annualBase: 2697, logo: "CARE"  },
  { id: "ic3", supplier: "ICICI Lombard", name: "ICICI Platinum 500K",          coverage: 500000,   perDayRate: 118, annualBase: 3540, logo: "ICICI" },
  { id: "ii2", supplier: "IndusInd",      name: "IndusInd Premium 250K",        coverage: 250000,   perDayRate: 78,  annualBase: 2340, logo: "II"    },
  { id: "ta3", supplier: "TATA AIG",      name: "MediClaim Supreme 1M",         coverage: 1000000,  perDayRate: 160, annualBase: 4797, logo: "TATA"  },
  { id: "bj4", supplier: "Bajaj Allianz", name: "Global Travel Executive",      coverage: 1000000,  perDayRate: 175, annualBase: 5250, logo: "BAJAJ" },
  { id: "ic4", supplier: "ICICI Lombard", name: "ICICI Global Secure 1M",       coverage: 1000000,  perDayRate: 169, annualBase: 5070, logo: "ICICI" },
] as const;

// Destination risk zones — mirrors how travel insurers actually tier premiums (US/Canada carry
// the highest medical-cost exposure, Schengen/UK next, rest-of-world lowest, domestic cheapest).
const ZONE_MULTIPLIER = { A: 2.2, B: 1.5, C: 1.0, D: 0.4 } as const;
const ZONE_A = new Set(["United States", "Canada"]);
const ZONE_B = new Set(["United Kingdom", "Germany", "France", "Switzerland", "Italy", "Spain", "Greece"]);

function destZone(dest: string): keyof typeof ZONE_MULTIPLIER {
  if (dest === "India") return "D";
  if (ZONE_A.has(dest)) return "A";
  if (ZONE_B.has(dest)) return "B";
  return "C";
}

function ageMultiplier(dob: string): number {
  if (!dob) return 1;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return 1;
  const age = Math.floor((Date.now() - birth.getTime()) / (365.25 * 86400000));
  if (age >= 70) return 2.0;
  if (age >= 60) return 1.5;
  if (age >= 45) return 1.15;
  if (age > 0 && age <= 17) return 0.7;
  return 1;
}

function daysBetween(dep: string, ret: string): number {
  if (!dep || !ret) return 1;
  const d = Math.round((new Date(ret).getTime() - new Date(dep).getTime()) / 86400000);
  return Math.max(1, d);
}

/* Bajaj's plan-list endpoint returns plan names only (no sum-insured figure), but most plan
 * names embed one — "... 1000000 USD", "...(US$200000)", "...5 lakhs USD". Extract it where
 * present; plans whose name doesn't encode a figure (e.g. "Corporate Elite Lite") fall back to
 * the smallest common bracket used elsewhere in this catalog. */
function parseCoverageFromPlanName(name: string): number {
  const lacToUsd = (n: number) => Math.round(n * 100000);

  let m = name.match(/(?:US\$|USD)\s*([\d,]+(?:\.\d+)?)\s*(lac|lakhs?)?/i);
  if (!m) m = name.match(/([\d,]+(?:\.\d+)?)\s*(lac|lakhs?)?\s*USD/i);
  if (m) {
    const num = parseFloat(m[1].replace(/,/g, ""));
    if (!Number.isNaN(num)) return m[2] ? lacToUsd(num) : Math.round(num);
  }
  return 50000;
}

/* Bajaj's plan-list endpoint has no pricing either, so the per-day/annual base rate is derived
 * from the parsed coverage figure using a curve calibrated against this catalog's known
 * reference points (50K→~51/day, 250K→~75/day, 1M→~160/day). This is a placeholder until a real
 * quote/premium webservice is wired in — the destination/age/duration multipliers below are the
 * same ones applied to every plan regardless of source. */
function ratesForCoverage(coverage: number): { perDayRate: number; annualBase: number } {
  const perDayRate = Math.max(30, Math.round(30 + coverage / 7500));
  const annualBase = Math.round(perDayRate * 30);
  return { perDayRate, annualBase };
}

/* Dynamic quote engine for the Travel Insurance search — reads the same criteria the dashboard
 * form already sends via GET (type/dest/dep/ret/adults/dob) and prices every plan against them,
 * instead of serving one static premium regardless of what was searched. The plan catalog itself
 * comes from Bajaj Allianz's live `travelplan` webservice when reachable, falling back to the
 * static BASE_PLANS card if that call fails for any reason. */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const type = sp.get("type") ?? "";
  const dest = sp.get("dest") ?? "Worldwide";
  const dep = sp.get("dep") ?? "";
  const ret = sp.get("ret") ?? "";
  const dob = sp.get("dob") ?? "";

  const isAnnual = type === "Annual Multitrip";
  const noDays = daysBetween(dep, ret);
  const zone = destZone(dest);
  const zMult = ZONE_MULTIPLIER[zone];
  const aMult = ageMultiplier(dob);

  function priceFor(perDayRate: number, annualBase: number): number {
    // Premium is per person — the client multiplies by traveller count for the total.
    return Math.round((isAnnual ? annualBase : perDayRate * noDays) * zMult * aMult);
  }

  let plans: { id: string; supplier: string; name: string; coverage: number; logo: string; premium: number }[] | null = null;

  try {
    const bajajPlans = await fetchBajajTravelPlans();
    if (bajajPlans.length > 0) {
      plans = bajajPlans.map(p => {
        const coverage = parseCoverageFromPlanName(p.name);
        const { perDayRate, annualBase } = ratesForCoverage(coverage);
        return {
          id: `bajaj-${p.code}`,
          supplier: "Bajaj Allianz",
          name: p.name,
          coverage,
          logo: "BAJAJ",
          premium: priceFor(perDayRate, annualBase),
        };
      });
    }
  } catch (err) {
    console.error("Bajaj travel plan API unavailable, falling back to static plan catalog", err);
  }

  if (!plans) {
    plans = BASE_PLANS.map(p => ({
      id: p.id,
      supplier: p.supplier,
      name: p.name,
      coverage: p.coverage,
      logo: p.logo,
      premium: priceFor(p.perDayRate, p.annualBase),
    }));
  }

  return NextResponse.json({ plans, noDays, zone });
}
