export interface InsuranceProposerInput {
  nationality: string; mobile: string; email: string;
  address1: string; address2: string;
  state: string; district: string; city: string; pincode: string; gst: string;
}

export interface InsuranceTravellerInput {
  title: string; firstName: string; lastName: string; dob: string;
  passport: string; relationship: string; nationality: string;
  nomineeFirst: string; nomineeLast: string;
}

export interface InsuranceRequestInput {
  amount: number;
  planName: string;
  supplier: string;
  coverage: number;
  dest: string;
  dep: string;
  ret: string;
  adults: number;
  children: number;
  proposer: InsuranceProposerInput;
  travellers: InsuranceTravellerInput[];
}

/* Validates the shape of an insurance-purchase request body. Both the Creditpool and Razorpay
 * insurance-verify routes accept the same client payload, so they share this parser. Amounts are
 * trusted as sent by the client, same as the flight-booking flow — this only checks shape/types. */
export function parseInsuranceRequest(body: unknown): InsuranceRequestInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  const amount = Number(b.amount);
  if (!amount || amount <= 0) return null;

  const p = b.proposer && typeof b.proposer === "object" ? (b.proposer as Record<string, unknown>) : {};
  const str = (v: unknown) => (typeof v === "string" ? v : "");

  const proposer: InsuranceProposerInput = {
    nationality: str(p.nationality) || "Indian",
    mobile: str(p.mobile),
    email: str(p.email),
    address1: str(p.address1),
    address2: str(p.address2),
    state: str(p.state),
    district: str(p.district),
    city: str(p.city),
    pincode: str(p.pincode),
    gst: str(p.gst),
  };

  const travellersRaw = Array.isArray(b.travellers) ? b.travellers : [];
  const travellers: InsuranceTravellerInput[] = travellersRaw.map((t) => {
    const tt = (t && typeof t === "object" ? t : {}) as Record<string, unknown>;
    return {
      title: str(tt.title), firstName: str(tt.firstName), lastName: str(tt.lastName),
      dob: str(tt.dob), passport: str(tt.passport), relationship: str(tt.relationship),
      nationality: str(tt.nationality) || "Indian",
      nomineeFirst: str(tt.nomineeFirst), nomineeLast: str(tt.nomineeLast),
    };
  });

  return {
    amount,
    planName: str(b.planName) || "Travel Insurance Plan",
    supplier: str(b.supplier) || "Insurance",
    coverage: Number(b.coverage) || 0,
    dest: str(b.dest) || "Worldwide",
    dep: str(b.dep),
    ret: str(b.ret),
    adults: Number(b.adults) || Math.max(1, travellers.length),
    children: Number(b.children) || 0,
    proposer,
    travellers,
  };
}
