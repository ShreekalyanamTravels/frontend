/* Reusable client for Bajaj Allianz's "BjazTravelWebServices" travel-insurance webservices.
 *
 * Each endpoint uses its own request envelope (e.g. `travelplan` expects `auserId` +
 * `aIntemdCode` + `pDealerCode`, while `getplandtls` expects `pUserId` with none of those) but
 * they all share the same credentials, host, and error-reporting shape (`pError_out` /
 * `pErrorCode_out`). This module centralises the credentials (`getBajajCredentials()`) and the
 * POST + error-handling boilerplate (`postToBajaj()`) so every endpoint function below — and any
 * added later — reads `auserId`/`apassword` from one place instead of each repeating env-var
 * lookups and response-checking. */

const DEFAULT_HOST = "https://htapi.preprod.bajajgeneral.com";

interface BajajCredentials {
  auserId: string;
  apassword: string;
  aIntemdCode: string;
}

function getBajajHost(): string {
  return process.env.BAJAJ_TRAVEL_API_HOST ?? DEFAULT_HOST;
}

function getBajajCredentials(): BajajCredentials {
  const auserId = process.env.BAJAJ_TRAVEL_API_USER_ID;
  const apassword = process.env.BAJAJ_TRAVEL_API_PASSWORD;
  const aIntemdCode = process.env.BAJAJ_TRAVEL_API_INTERMD_CODE;

  if (!auserId || !apassword || !aIntemdCode) {
    throw new Error(
      "Bajaj travel API credentials are not configured — set BAJAJ_TRAVEL_API_USER_ID, " +
      "BAJAJ_TRAVEL_API_PASSWORD and BAJAJ_TRAVEL_API_INTERMD_CODE"
    );
  }
  return { auserId, apassword, aIntemdCode };
}

export interface BajajErrorOut {
  errNumber?: string;
  parName?: string;
  property?: string;
  errText?: string | null;
  parIndex?: string;
  errLevel?: string;
}

interface BajajEnvelopeResponse {
  pError_out?: BajajErrorOut;
  pErrorCode_out?: string;
}

const ERROR_PLACEHOLDER = { errNumber: "", parName: "", property: "", errText: "", parIndex: "", errLevel: "" };

/* Thrown by postToBajaj for both HTTP-level and business-logic (pErrorCode_out) failures —
 * carries whatever response body was actually parsed (if any) so callers that need to log/persist
 * the raw exchange (e.g. issueBajajPolicy) can still get at it instead of just an error message. */
export class BajajApiError extends Error {
  responseBody: unknown;
  constructor(message: string, responseBody: unknown = null) {
    super(message);
    this.name = "BajajApiError";
    this.responseBody = responseBody;
  }
}

/* Low-level POST to a Bajaj travel webservice endpoint — the only part every endpoint truly
 * shares (fetch + non-2xx / non-zero-error-code handling). Callers assemble the exact body their
 * endpoint expects, using `getBajajCredentials()` for the auth fields. */
async function postToBajaj<T extends BajajEnvelopeResponse>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${getBajajHost()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => null);
    throw new BajajApiError(`Bajaj travel API ${path} responded with HTTP ${res.status}`, bodyText);
  }

  const data = (await res.json()) as T;

  if (data.pErrorCode_out && data.pErrorCode_out !== "0") {
    const message = data.pError_out?.errText || `Bajaj travel API error code ${data.pErrorCode_out}`;
    throw new BajajApiError(`Bajaj travel API ${path}: ${message}`, data);
  }

  return data;
}

// Same US/Canada vs Schengen buckets used for the synthetic pricing fallback in
// /api/insurance/plans, just mapped to Bajaj's actual area-plan name strings instead of a risk
// multiplier — the two most-quoted travel-insurance destination buckets, with everything else
// (and India, since these are international plans) falling into the broad "excluding" bucket.
const ZONE_US_CANADA = new Set(["United States", "Canada"]);
const ZONE_SCHENGEN = new Set(["United Kingdom", "Germany", "France", "Switzerland", "Italy", "Spain", "Greece"]);

/* Shared across every Bajaj call that needs an area-plan string (premium quote, policy issuance)
 * so they can never disagree on which zone a destination falls into. */
export function destToAreaPlan(dest: string): string {
  if (ZONE_US_CANADA.has(dest)) return "Worldwide Including USA and Canada";
  if (ZONE_SCHENGEN.has(dest)) return "Schengen";
  return "Worldwide Excluding USA and Canada";
}

/* Parsed from the "YYYY-MM-DD" parts directly (not via `new Date(iso).getDate()`) so a server
 * timezone behind UTC doesn't roll the date back a day — every Bajaj webservice that takes a date
 * needs the exact "DD-Mon-YYYY" (e.g. "30-Jul-2024") the traveller picked, or it returns an
 * inaccurate/zero premium (or issues a policy for the wrong dates). */
export function toBajajDate(iso: string): string | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [, year, month, day] = m;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthIdx = Number(month) - 1;
  if (monthIdx < 0 || monthIdx > 11) return null;
  return `${day}-${months[monthIdx]}-${year}`;
}

export interface BajajTravelPlanOption {
  code: string;
  name: string;
}

interface TravelPlanListResponse extends BajajEnvelopeResponse {
  pTravelList_out?: Array<{ countPplan?: string; pplan?: string }>;
}

// The plan list takes no request-specific params — Bajaj returns the exact same master catalog
// every time (confirmed: /api/insurance/plans took 1.3-2.2s per call, every call, with nothing to
// distinguish one request from the next). Caching this the same way moduleSetting() does turns
// every request after the first into an in-memory read instead of a fresh ~1.5s+ round trip.
const PLANS_TTL_MS = 30 * 60 * 1000;
// Bajaj's preprod `travelplan` endpoint is observed to fail intermittently (TWS-04 "No plans
// present"), each failing attempt still costing several seconds before the caller's try/catch
// falls back to the static catalog. Without a cooldown, a page that fires several requests during
// an outage window re-attempts (and re-waits out) the same failure every single time. Remembering
// the failure for a short window turns those into an instant re-throw instead.
const PLANS_FAILURE_COOLDOWN_MS = 60 * 1000;

declare global {
  // eslint-disable-next-line no-var
  var _bajajPlansCache: { plans: BajajTravelPlanOption[]; expires: number } | undefined;
  // eslint-disable-next-line no-var
  var _bajajPlansFailureUntil: number | undefined;
  // eslint-disable-next-line no-var
  var _bajajPlanDetailsCache: Map<string, { details: BajajPlanDetails; expires: number }> | undefined;
}

/* Fetches Bajaj Allianz's master list of travel-insurance plan names via `POST /travelplan`.
 * Note: this endpoint only returns plan names/codes, not pricing or coverage — callers that need
 * a premium/sum-insured figure must derive or fetch it separately. */
export async function fetchBajajTravelPlans(): Promise<BajajTravelPlanOption[]> {
  const cached = global._bajajPlansCache;
  if (cached && cached.expires > Date.now()) {
    return cached.plans;
  }

  if (global._bajajPlansFailureUntil && global._bajajPlansFailureUntil > Date.now()) {
    throw new BajajApiError("Bajaj travel plan API in failure cooldown — skipping retry");
  }

  const { auserId, apassword, aIntemdCode } = getBajajCredentials();

  let data: TravelPlanListResponse;
  try {
    data = await postToBajaj<TravelPlanListResponse>("/BjazTravelWebServices/travelplan", {
      auserId,
      apassword,
      aIntemdCode,
      pDealerCode: "0",
      pIntermediaryList_out: [{ pAgentCode: "" }],
      pTravelList_out: [{ countPplan: "", pplan: "" }],
      pError_out: ERROR_PLACEHOLDER,
      pErrorCode_out: "0",
    });
  } catch (err) {
    global._bajajPlansFailureUntil = Date.now() + PLANS_FAILURE_COOLDOWN_MS;
    throw err;
  }

  const plans = (data.pTravelList_out ?? [])
    .filter((row): row is { countPplan: string; pplan: string } => !!row?.pplan)
    .map(row => ({ code: row.countPplan ?? "", name: row.pplan }));

  global._bajajPlansCache = { plans, expires: Date.now() + PLANS_TTL_MS };
  return plans;
}

export interface BajajPlanAreaDetail {
  areaName: string;
  minAge: string;
  maxAge: string;
  minDays: string;
  maxDays: string;
}

export interface BajajPlanBenefit {
  benefit: string;
  deductible: string;
  limit: string;
}

export interface BajajPlanDetails {
  areas: BajajPlanAreaDetail[];
  benefits: BajajPlanBenefit[];
}

interface PlanDetailsResponse extends BajajEnvelopeResponse {
  pTrvPlanDtlsList_out?: Array<{
    areaname?: string; minAgeFrom?: string; maxAgeTo?: string; minDaysFrom?: string; maxDaysTo?: string;
  }>;
  pTrvCoverDtlsList_out?: Array<{ pbenefits?: string; pdeductible?: string; plimits?: string }>;
}

/* Fetches full details (eligible age/duration per coverage area, and the benefit/limit/
 * deductible schedule) for one named plan via `POST /getplandtls`. `planName` must match a
 * `name` returned by fetchBajajTravelPlans() exactly (Bajaj looks it up by name, not code). */
export async function fetchBajajPlanDetails(planName: string): Promise<BajajPlanDetails> {
  const cache = (global._bajajPlanDetailsCache ??= new Map());
  const cached = cache.get(planName);
  if (cached && cached.expires > Date.now()) {
    return cached.details;
  }

  const { auserId, apassword } = getBajajCredentials();

  const data = await postToBajaj<PlanDetailsResponse>("/BjazTravelWebServices/getplandtls", {
    pUserId: auserId,
    apassword,
    aPlanname: planName,
    pTrvPlanDtlsList_out: [{
      maxAgeTo: "", planname: "", areaname: "", minAgeFrom: "", minDaysFrom: "",
      extCol10: "", maxDaysTo: "", extCol9: "", extCol8: "", extCol7: "", extCol6: "",
      extCol5: "", extCol4: "", extCol3: "", extCol2: "", extCol1: "",
    }],
    pTrvCoverDtlsList_out: [{ pbenefits: "", pdeductible: "", plimits: "" }],
    pError_out: ERROR_PLACEHOLDER,
    pErrorCode_out: "0",
  });

  const areas = (data.pTrvPlanDtlsList_out ?? [])
    .filter(row => !!row?.areaname)
    .map(row => ({
      areaName: row.areaname ?? "",
      minAge: row.minAgeFrom ?? "",
      maxAge: row.maxAgeTo ?? "",
      minDays: row.minDaysFrom ?? "",
      maxDays: row.maxDaysTo ?? "",
    }));

  const benefits = (data.pTrvCoverDtlsList_out ?? [])
    .filter(row => !!row?.pbenefits)
    .map(row => ({
      benefit: row.pbenefits ?? "",
      deductible: row.pdeductible ?? "",
      limit: row.plimits ?? "",
    }));

  const details = { areas, benefits };
  cache.set(planName, { details, expires: Date.now() + PLANS_TTL_MS });
  return details;
}

export interface BajajPremiumInput {
  travelPlan: string;
  areaPlan: string;
  /** DD-Mon-YYYY, e.g. "25-Jul-2026" */
  fromDate: string;
  /** DD-Mon-YYYY */
  toDate: string;
  /** DD-Mon-YYYY */
  dob: string;
  age: number;
  sex?: "M" | "F";
  name?: string;
  /** Bajaj's premium calc requires a pincode ("pdiscount") even for an estimate — falls back to
   * a generic default when the traveller's real pincode isn't known yet (e.g. still on the plan
   * list, before proposer details are collected). */
  pincode?: string;
}

export interface BajajPremiumResult {
  basePremium: number;
  totalPremium: number;
  serviceTax: number;
  eduCessAmt: number;
}

interface CalculatePremiumResponse extends BajajEnvelopeResponse {
  pTravelPremiumOut_out?: {
    pbasePremium?: string;
    ptotalPremium?: string;
    pserviceTax?: string;
    peduCessAmt?: string;
  } | null;
}

const DEFAULT_PINCODE = "411006";

// The plans list checks eligibility by calling this once per plan (4 at a time) for the exact
// same fromDate/toDate/dob/age/areaPlan every time — only `travelPlan` varies within one page
// load. A short cache turns a repeated identical quote (React re-render, user going back to the
// same search, a retried request) into an instant read, and the failure cooldown stops a Bajaj
// outage from making every one of those ~15 calls independently wait out its own timeout.
const PREMIUM_TTL_MS = 10 * 60 * 1000;
const PREMIUM_FAILURE_COOLDOWN_MS = 60 * 1000;

declare global {
  // eslint-disable-next-line no-var
  var _bajajPremiumCache: Map<string, { result: BajajPremiumResult; expires: number }> | undefined;
  // eslint-disable-next-line no-var
  var _bajajPremiumFailureUntil: number | undefined;
}

/* Fetches a real premium quote for one plan via `POST /calculatepremium`. Note this endpoint's
 * credential fields are named differently again (`userid`/`password`, not `auserId`/`apassword`)
 * — same underlying credentials, just mapped to whatever field names this specific endpoint
 * expects, via getBajajCredentials(). A `totalPremium` of 0 with no error code means the
 * plan/area/age combination isn't actually quotable (Bajaj doesn't surface that as an error). */
export async function fetchBajajPremium(input: BajajPremiumInput): Promise<BajajPremiumResult> {
  const cacheKey = JSON.stringify(input);
  const cache = (global._bajajPremiumCache ??= new Map());
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.result;
  }

  if (global._bajajPremiumFailureUntil && global._bajajPremiumFailureUntil > Date.now()) {
    throw new BajajApiError("Bajaj premium API in failure cooldown — skipping retry");
  }

  const { auserId, apassword } = getBajajCredentials();

  let data: CalculatePremiumResponse;
  try {
    data = await postToBajaj<CalculatePremiumResponse>("/BjazTravelWebServices/calculatepremium", {
      userid: auserId,
      password: apassword,
      familyflag: "N",
      puwFlag_out: "",
      travelpremiumin: {
        pspdiscount: "",
        ploading: "N",
        ptodate: input.toDate,
        ptravelplan: input.travelPlan,
        pdateofbirth: input.dob,
        pfromdate: input.fromDate,
        pareaplan: input.areaPlan,
        pdiscount: input.pincode || DEFAULT_PINCODE,
      },
      pTravelPremiumOut_out: {
        ploadingAmt: "", pextraCol: "", pfullTermPremium: "", pbasePremium: "", pdiscountAmt: "",
        pserviceTax: "", pextraCol2: "", peduCessAmt: "", ptotalPremium: "", pspDiscountAmt: "", pextraCol1: "",
      },
      familyparamlist: [{
        pvassignee: input.name || "Traveller",
        pvpartnerid: "",
        pvrelation: "SELF",
        pvname: input.name || "Traveller",
        pvpassportno: "",
        pvage: String(input.age),
        pvsex: input.sex || "M",
        pvdob: input.dob,
      }],
      pError_out: ERROR_PLACEHOLDER,
      pErrorCode_out: "0",
    });
  } catch (err) {
    global._bajajPremiumFailureUntil = Date.now() + PREMIUM_FAILURE_COOLDOWN_MS;
    throw err;
  }

  const out = data.pTravelPremiumOut_out;
  const num = (v: string | undefined) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const result: BajajPremiumResult = {
    basePremium: num(out?.pbasePremium),
    totalPremium: num(out?.ptotalPremium),
    serviceTax: num(out?.pserviceTax),
    eduCessAmt: num(out?.peduCessAmt),
  };
  cache.set(cacheKey, { result, expires: Date.now() + PREMIUM_TTL_MS });
  return result;
}

export interface BajajIssuePolicyTraveller {
  firstName: string;
  lastName: string;
  /** DD-Mon-YYYY */
  dob: string;
  age: number;
  sex: "M" | "F";
  passport?: string;
  relationship: string;
}

export interface BajajIssuePolicyInput {
  travelPlan: string;
  areaPlan: string;
  /** DD-Mon-YYYY */
  fromDate: string;
  /** DD-Mon-YYYY */
  toDate: string;
  totalPremium: number;
  /** Nominee's full name — despite the field's name, Bajaj's `passigneename` expects the
   * nominee, not the proposer or lead traveller. */
  nomineeName: string;
  proposer: {
    firstName: string;
    lastName: string;
    /** DD-Mon-YYYY */
    dob: string;
    sex: "M" | "F";
    email: string;
    mobile: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    pincode: string;
    /** GSTIN, if the corporate supplied one — closest match to Bajaj's `taxid` field. */
    gst?: string;
  };
  /** Every traveller on the policy — each gets its own entry in `familyparamlist` (own name,
   * passport, age, sex, DOB). `pvassignee` on every entry is still the proposer's name, per
   * Bajaj's convention, not the traveller's own name. */
  travellers: BajajIssuePolicyTraveller[];
}

export interface BajajIssuePolicyResult {
  /** Bajaj's own policy reference, when it echoes one back in `pPolicyObj_out`. Empty if the
   * response didn't include one — callers should keep whatever internal ref they already have. */
  policyNumber: string;
  /** Exact request body sent to /issuepolicy — for callers that store it (e.g. insurance_bookings
   * .json_req_data). */
  requestBody: unknown;
  /** Response body received, whether the call succeeded or failed — for callers that store it
   * (e.g. insurance_bookings.json_res_data). */
  raw: unknown;
  /** Set when the call failed — `raw`/`policyNumber` still reflect whatever was recovered. */
  error?: string;
}

interface IssuePolicyResponse extends BajajEnvelopeResponse {
  pWeoTrvProcessPolicyIn_inout?: { policyNo?: string } & Record<string, unknown> | null;
  pPolicyObj_out?: { ppolicyRef?: string } & Record<string, unknown> | null;
}

// Bajaj's fixed product code for this travel-insurance line, per their sample issuepolicy payload.
const ISSUE_PRODUCT_CODE = "9910";

/* addressline1 is the proposer's full address including city/state/country-pincode (addressline2
 * stays their plain second address line) — the proposer form only collects country implicitly
 * (this platform is India-only, same as the fixed `nationalid: "INDIA"` elsewhere in this
 * payload), so "India" is used directly rather than a field that doesn't exist. */
function combineProposerAddressLine1(p: BajajIssuePolicyInput["proposer"]): string {
  const base = [p.address1, p.city, p.state, "India"].filter(Boolean).join(", ");
  return p.pincode ? `${base} - ${p.pincode}` : base;
}

/* Issues a real Bajaj policy via `POST /issuepolicy` — mirrors Bajaj's own sample payload
 * field-for-field (including the account/registration fields their sample always sends empty,
 * which aren't applicable to a corporate travel policy). Only call this after payment has already
 * succeeded: see issueInsurancePolicy() in app/lib/issueInsurancePolicy.ts, the sole caller, which
 * treats a failure here as non-fatal (logged, not rolled back) since the customer has already
 * been charged. */
export async function issueBajajPolicy(input: BajajIssuePolicyInput): Promise<BajajIssuePolicyResult> {
  const { auserId, apassword } = getBajajCredentials();
  const lead = input.travellers[0];
  if (!lead) throw new Error("issueBajajPolicy: at least one traveller is required");

  const totalPremium = String(Math.round(input.totalPremium));
  const proposerName = `${input.proposer.firstName} ${input.proposer.lastName}`.trim();

  const requestBody = {
    userid: auserId,
    password: apassword,
    bjaztravelissue: {
      passigneename: input.nomineeName || proposerName,
      pfulltermpremium: totalPremium,
      telephone3: "",
      ptotalpremium: totalPremium,
      telephone2: "",
      nationalid: "INDIA",
      userid: input.proposer.firstName || proposerName,
      surname: input.proposer.lastName,
      ppremiumpayerid: "0",
      partnerref: "P",
      psubagentcode: "0",
      pdealercode: "0",
      ploading: "0",
      pfamilyflag: input.travellers.length > 1 ? "Y" : "N",
      pservicetaxamt: "0",
      ppartnerid: "0",
      pdiscount: input.proposer.pincode || "0",
      middlename: "",
      fax: "0",
      countrycode: "0",
      addressline5: "",
      addressline4: "",
      addressline3: "",
      postcode: input.proposer.pincode || "",
      pproduct: ISSUE_PRODUCT_CODE,
      addressline2: input.proposer.address2 || "",
      pfromdate: input.fromDate,
      addressline1: combineProposerAddressLine1(input.proposer),
      pcompref: "",
      taxid: input.proposer.gst || "",
      email: input.proposer.email,
      pruralflag: "",
      pcovernoteno: "",
      quality: "0",
      ptravelplan: input.travelPlan,
      ppassportno: lead.passport || "",
      pservicecharge: "",
      ppaymentmode: "Agent float",
      language: "",
      pspcondition: "N",
      pareaplan: input.areaPlan,
      ppremiumpayerflag: "",
      employmentstatus: "",
      pmasterpolicyno: "0",
      dateofbirth: input.proposer.dob,
      sex: input.proposer.sex,
      institutionname: "",
      contact1: input.proposer.mobile,
      partid: "0",
      addid: "0",
      maritalstatus: "",
      partnertype: "P",
      ptermstartdate: input.fromDate,
      regnumber: "0",
      plocationcode: "",
      pempno: "0",
      policyno: "",
      firstname: input.proposer.firstName,
      pdateofbirth: input.proposer.dob,
      aftertitle: "",
      pintermediarycode: "",
      ptermenddate: input.toDate,
      beforetitle: "",
      ptodate: input.toDate,
      pdestination: input.areaPlan,
      pusername: proposerName,
      pspdiscountamt: "0",
      pspdiscount: "0",
      checkbox: "",
      pcoorgunit: "",
      vatnumber: "0",
      notes: "",
      telephone: input.proposer.mobile,
    },
    familyparamlist: input.travellers.map(t => ({
      pvassignee: proposerName,
      pvpartnerid: "",
      pvrelation: t.relationship || "SELF",
      pvname: `${t.firstName} ${t.lastName}`.trim(),
      pvpassportno: t.passport || "",
      pvage: String(t.age),
      pvsex: t.sex,
      pvdob: t.dob,
    })),
    pCoverList_out: [{ pbenefits: "", pdeductible: "", plimits: "" }],
    // One entry per traveller on the policy — e.g. 2 travellers selected on a Family Floater
    // purchase produces 2 entries here, mirroring familyparamlist above.
    pPolicyFamilyList_out: input.travellers.map(t => ({
      passignee: proposerName,
      pdob: t.dob,
      pname: `${t.firstName} ${t.lastName}`.trim(),
      pgender: t.sex,
      prelation: t.relationship || "SELF",
      ppassport: t.passport || "",
    })),
    pPolicyObj_out: {
      passigneeName: "", pfullTermPremium: "", ptelephone: "", pdepartureDate: "",
      paddressLine2: "", paddressLine3: "", paddressLine1: "", ppolicyRef: "",
      pgrossPremium: "", pserviceTaxAmt: "", pplan: "", pdateOfBirth: "",
      preturnDate: "", pimdcode: "", psurname: "", parea: input.areaPlan,
      pcustomerTextName: "", pfirstName: "", ppostcode: "", ppartId: "",
      ppassportNo: "", pspCondition: "", pentryDate: "",
      recString20: {
        stringValue1: "", stringValue2: "", stringValue3: "", stringValue4: "", stringValue5: "",
        stringValue6: "", stringValue7: "", stringValue8: "", stringValue9: "", stringValue10: "",
        stringValue11: "", stringValue12: "", stringValue13: "", stringValue14: "", stringValue15: "",
        stringValue16: "", stringValue17: "", stringValue18: "", stringValue19: "", stringValue20: "",
      },
    },
    ppayDtls_out: "",
    pagentName_out: "",
    proLocationAdd_out: "",
    pError_out: ERROR_PLACEHOLDER,
    pErrorCode_out: "0",
  };

  try {
    const data = await postToBajaj<IssuePolicyResponse>("/BjazTravelWebServices/issuepolicy", requestBody);
    return {
      policyNumber: data.pWeoTrvProcessPolicyIn_inout?.policyNo || data.pPolicyObj_out?.ppolicyRef || "",
      requestBody,
      raw: data,
    };
  } catch (err) {
    return {
      policyNumber: "",
      requestBody,
      raw: err instanceof BajajApiError ? err.responseBody : null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
