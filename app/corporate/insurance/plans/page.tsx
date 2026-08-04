'use client';
import { useState, useEffect, Suspense, type CSSProperties } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Inter, Playfair_Display } from 'next/font/google';
import { SUPPLIER_COLORS, SUPPLIER_LABELS } from '../insuranceData';
import { TravelerPopover, type TravelerEntry } from '../../components/TravelerPopover';
import CorpHeader from '../../components/CorpHeader';

const inter    = Inter({ subsets: ['latin'], weight: ['400','500','600','700','800'] });
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'], style: ['italic'] });

const O  = '#f07820';
const GR = '#7ab317';  // lime green for Select button (matches reference)

const STEPS = ['Plan Search', 'Select Plan', 'Traveller Details', 'Payment', 'Policy Issued'];

const COVERAGE_BUCKETS = [
  { label: 'Below $50,000',          max: 49999  },
  { label: '$50,001 – $250,000',     max: 250000 },
  { label: '$250,001 – $500,000',    max: 500000 },
  { label: '$500,001 – $1,000,000',  max: 1000000},
];

const INS_TYPES = ['Individual', 'Family Floater', 'Annual Multitrip'];
const COUNTRIES = [
  'India', 'United Arab Emirates', 'United Kingdom', 'United States', 'Singapore', 'Thailand',
  'Malaysia', 'Sri Lanka', 'Nepal', 'Maldives', 'Australia', 'Canada', 'Germany', 'France',
  'Japan', 'South Korea', 'Indonesia', 'Vietnam', 'Philippines', 'New Zealand', 'Switzerland',
  'Italy', 'Spain', 'Greece', 'Turkey', 'Egypt', 'South Africa', 'Kenya', 'Dubai', 'Bahrain', 'Qatar', 'Oman',
];

/* Shared field styles for the editable search bar */
const FIELD_LBL: CSSProperties = {
  fontSize: 9.5, fontWeight: 700, color: '#aaa', letterSpacing: '.07em',
  textTransform: 'uppercase', marginBottom: 3,
};
const FIELD_LBL_PLAIN: CSSProperties = { ...FIELD_LBL };
const FIELD_SELECT: CSSProperties = {
  fontSize: 13.5, fontWeight: 800, color: '#1a1a2e', border: 'none', outline: 'none',
  background: 'transparent', fontFamily: 'inherit', appearance: 'none', cursor: 'pointer', width: '100%',
};
const FIELD_INPUT: CSSProperties = {
  fontSize: 13.5, fontWeight: 800, color: '#1a1a2e', border: 'none', outline: 'none',
  background: 'transparent', fontFamily: 'inherit', cursor: 'pointer', width: '100%',
};

type Plan = { id: string; supplier: string; name: string; coverage: number; premium: number; logo: string };

function fmt(n: number) { return '$' + n.toLocaleString('en-US'); }

function displayTripType(type: string) {
  return type === 'single' ? 'Single Trip'
    : type === 'annual' || type === 'Annual Multitrip' ? 'Annual Multi-Trip'
    : type;
}

/* Runs `fn` over `items` with at most `limit` in flight at once — used to fetch real per-plan
 * premiums from Bajaj without firing dozens of requests at their API simultaneously. */
async function mapWithConcurrency<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const item = items[next++];
      await fn(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

/* Logo badge — real supplier artwork when we have one (Bajaj Allianz), falling back to the
 * colored initials badge for any other supplier or if the image fails to load. */
function SupplierLogo({ logo }: { logo: string }) {
  const [failed, setFailed] = useState(false);

  if (logo === 'BAJAJ' && !failed) {
    return (
      <div style={{ width:64, height:64, borderRadius:8, flexShrink:0, overflow:'hidden',
        border:'1px solid #eee' }}>
        <img
          src="/insurance_icons/bajaj-allianz-logo.jpg"
          alt="Bajaj Allianz"
          onError={() => setFailed(true)}
          style={{ width:'100%', height:'100%', objectFit:'cover' }}
        />
      </div>
    );
  }

  const col = SUPPLIER_COLORS[logo];
  const lbl = SUPPLIER_LABELS[logo];
  return (
    <div style={{ width:72, height:56, borderRadius:8, background:col, flexShrink:0,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      padding:'4px 6px' }}>
      <span style={{ fontSize:12, fontWeight:800, color:'#fff', lineHeight:1.2 }}>{lbl.line1}</span>
      <span style={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,.85)', lineHeight:1.2 }}>{lbl.line2}</span>
    </div>
  );
}

type PlanDetails = {
  areas: { areaName:string; minAge:string; maxAge:string; minDays:string; maxDays:string }[];
  benefits: { benefit:string; deductible:string; limit:string }[];
};

function PlanCard({ plan, onSelect }: { plan: Plan; onSelect: () => void }) {
  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState<PlanDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');

  function toggleDetails() {
    setShowDetails(p => !p);
    if (details || detailsLoading) return;
    setDetailsLoading(true);
    setDetailsError('');
    fetch(`/api/insurance/plan-details?plan=${encodeURIComponent(plan.name)}`)
      .then(async res => {
        const data = await res.json();
        if (!res.ok) { setDetailsError(data.error ?? 'Unable to fetch policy details.'); return; }
        setDetails(data);
      })
      .catch(() => setDetailsError('Unable to fetch policy details.'))
      .finally(() => setDetailsLoading(false));
  }

  const gst = Math.round(plan.premium * 0.18);
  const totalPremium = plan.premium + gst;

  return (
    <div style={{ background:'#fff', borderRadius:10, border:'1.5px solid #e8e8e8',
      marginBottom:12, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
      <div style={{ display:'flex', alignItems:'center', padding:'16px 20px', gap:20 }}>

        {/* Logo badge */}
        <SupplierLogo logo={plan.logo} />

        {/* Plan name */}
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#1a1a2e', marginBottom:2 }}>{plan.name}</div>
          <div style={{ fontSize:11.5, color:'#888' }}>{plan.supplier}</div>
        </div>

        {/* Coverage */}
        <div style={{ textAlign:'center', minWidth:100 }}>
          <div style={{ fontSize:10, fontWeight:600, color:'#aaa', textTransform:'uppercase',
            letterSpacing:'.06em', marginBottom:3 }}>Coverage</div>
          <div style={{ fontSize:16, fontWeight:800, color:'#1a1a2e' }}>{fmt(plan.coverage)}</div>
        </div>

        {/* Premium */}
        <div style={{ textAlign:'center', minWidth:90 }}>
          <div style={{ fontSize:10, fontWeight:600, color:'#aaa', textTransform:'uppercase',
            letterSpacing:'.06em', marginBottom:3 }}>Premium</div>
          <div style={{ fontSize:16, fontWeight:800, color:'#1a1a2e' }}>₹{plan.premium.toLocaleString('en-US')}</div>
        </div>

        {/* Policy details */}
        <button onClick={toggleDetails}
          style={{ background:'none', border:'none', cursor:'pointer', fontSize:12.5,
            color:'#2a6fcc', fontWeight:600, textDecoration:'underline', fontFamily:'inherit',
            whiteSpace:'nowrap', padding:'0 8px' }}>
          Policy details
        </button>

        {/* Select */}
        <button onClick={onSelect}
          style={{ padding:'10px 28px', background:GR, color:'#fff', border:'none',
            borderRadius:8, fontSize:13.5, fontWeight:800, cursor:'pointer',
            fontFamily:'inherit', whiteSpace:'nowrap', boxShadow:`0 3px 10px ${GR}55` }}>
          Select
        </button>
      </div>

      {/* Expanded policy details */}
      {showDetails && (
        <div style={{ borderTop:'1px solid #f0f0f0', padding:'14px 20px', background:'#fafafa' }}>

          {detailsLoading && (
            <div style={{ fontSize:12.5, color:'#999', padding:'6px 0 14px' }}>Loading policy details…</div>
          )}

          {detailsError && !detailsLoading && (
            <div style={{ fontSize:12.5, color:'#c9184a', padding:'6px 0 14px' }}>{detailsError}</div>
          )}

          {details && !detailsLoading && (
            <>
              {details.areas.length > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:12 }}>
                  {details.areas.map(a => (
                    <div key={a.areaName} style={{ padding:'6px 12px', background:'#fff',
                      border:'1px solid #ececec', borderRadius:20, fontSize:11.5, color:'#666' }}>
                      <strong style={{ color:'#1a1a2e' }}>{a.areaName}</strong>
                      {' · Age '}{a.minAge}–{a.maxAge}{' · '}{a.minDays}–{a.maxDays} days
                    </div>
                  ))}
                </div>
              )}

              {details.benefits.length > 0 && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:12 }}>
                  {details.benefits.map((b, i) => {
                    const limitNum = Number(b.limit);
                    const limitDisplay = Number.isFinite(limitNum) && b.limit !== ''
                      ? '$' + limitNum.toLocaleString('en-US') : (b.limit || '—');
                    const hasDeductible = b.deductible && b.deductible !== '0';
                    return (
                      <div key={`${b.benefit}-${i}`} style={{ padding:'8px 12px', background:'#fff',
                        borderRadius:7, border:'1px solid #ececec' }}>
                        <div style={{ fontSize:11, color:'#666', marginBottom:3, lineHeight:1.3 }}>{b.benefit}</div>
                        <div style={{ fontSize:13, fontWeight:700, color:'#1a1a2e' }}>
                          {limitDisplay}
                          {hasDeductible && (
                            <span style={{ fontSize:10, color:'#aaa', fontWeight:500 }}> (ded. {b.deductible})</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
            <div style={{ padding:'8px 12px', background:'#fff', borderRadius:7, border:'1px solid #ececec' }}>
              <div style={{ fontSize:9.5, color:'#aaa', fontWeight:600, marginBottom:3,
                textTransform:'uppercase', letterSpacing:'.05em' }}>GST (18%)</div>
              <div style={{ fontSize:13, fontWeight:700, color:'#1a1a2e' }}>₹{gst.toLocaleString('en-US')}</div>
            </div>
            <div style={{ padding:'8px 12px', background:'#fff', borderRadius:7, border:'1px solid #ececec' }}>
              <div style={{ fontSize:9.5, color:'#aaa', fontWeight:600, marginBottom:3,
                textTransform:'uppercase', letterSpacing:'.05em' }}>Total Premium</div>
              <div style={{ fontSize:13, fontWeight:700, color:'#1a1a2e' }}>₹{totalPremium.toLocaleString('en-US')}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlansContent() {
  const router  = useRouter();
  const sp      = useSearchParams();
  const adults  = parseInt(sp.get('adults')  || '1');
  const dest    = sp.get('dest') || 'Worldwide';
  const dep     = sp.get('dep')  || '';
  const ret     = sp.get('ret')  || '';
  const insType = displayTripType(sp.get('type') || 'single');
  const dob     = sp.get('dob')  || '';

  /* ── Editable search bar — lets the traveller change trip criteria right here instead of
   * having to go back to the dashboard. Submitting re-pushes this same page with the updated
   * query string, which the live-quotes effect below picks up automatically. ── */
  const [formType,      setFormType]      = useState(sp.get('type') || 'Individual');
  const [formFrom,      setFormFrom]      = useState(sp.get('from') || 'India');
  const [formDest,      setFormDest]      = useState(dest);
  const [formDep,       setFormDep]       = useState(dep);
  const [formRet,       setFormRet]       = useState(ret);
  const [formAdults,    setFormAdults]    = useState(adults);
  const [formDob,       setFormDob]       = useState(dob);
  const [formTravelers, setFormTravelers] = useState<TravelerEntry[]>([{ dob, relationship: '' }]);
  const [showFormErrors, setShowFormErrors] = useState(false);

  // Keep the per-traveler list sized to the current passenger count for Family Floater
  // (each traveler gets their own relationship + DOB instead of one shared DOB).
  useEffect(() => {
    if (formType !== 'Family Floater') return;
    setFormTravelers(prev => {
      const next = prev.slice(0, formAdults);
      while (next.length < formAdults) next.push({ dob: '', relationship: '' });
      if (next[0]) next[0] = { ...next[0], relationship: 'SELF' };
      return next;
    });
  }, [formType, formAdults]);

  // Annual Multitrip is a fixed 365/366-day term — end date is always exactly one year after
  // start, never independently chosen, so it's kept locked (input disabled below) and recomputed
  // any time the start date or type changes. This also guards against the End Date field's native
  // date-input drifting away from the correct term (e.g. an accidental scroll-to-increment while
  // it was still editable) and producing a bogus "No of Days" count.
  // Computed from the string parts directly (not via Date -> toISOString) so a local timezone
  // ahead of UTC doesn't roll the result back a day.
  useEffect(() => {
    if (formType !== 'Annual Multitrip') return;
    const start = formDep || new Date().toISOString().slice(0, 10);
    if (!formDep) setFormDep(start);
    const [y, m, d] = start.split('-').map(Number);
    setFormRet(`${y + 1}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }, [formType, formDep]);

  function handleModifySearch() {
    const valid = formType === 'Family Floater'
      ? formTravelers.slice(0, formAdults).every(t => t.dob && t.relationship)
      : Boolean(formDob);

    if (!valid) {
      setShowFormErrors(true);
      return;
    }
    setShowFormErrors(false);

    const leadDob = formType === 'Family Floater' ? (formTravelers[0]?.dob || '') : formDob;
    const params = new URLSearchParams({
      type: formType, from: formFrom, dest: formDest, dep: formDep, ret: formRet,
      adults: String((formType === 'Individual' || formType === 'Annual Multitrip') ? 1 : formAdults), children: '0', dob: leadDob,
    });
    setSupplierFilter([]);
    setCoverageFilter([]);
    router.push(`/corporate/insurance/plans?${params.toString()}`);
  }

  /* Live day count for the editable search bar — derived straight from formDep/formRet so it
   * always matches whatever dates are currently typed there, instead of relying on a value from
   * the last *submitted* search (which would show a stale/mismatched count while the traveller
   * is still editing the dates). */
  const formNoDays = formDep && formRet
    ? Math.max(0, Math.round((new Date(formRet).getTime() - new Date(formDep).getTime()) / 86400000))
    : 0;

  /* ── Live quotes — fetched via GET using the exact same search criteria that's already in
   * this page's own URL, so the plans and premiums reflect what was actually searched instead
   * of one static price list. ── */
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingPlans(true);
    setPlans([]);
    fetch(`/api/insurance/plans?${sp.toString()}`)
      .then(res => res.json())
      .then(async data => {
        if (cancelled) return;
        const loadedPlans: Plan[] = data.plans ?? [];

        // Without trip dates + DOB there's no eligibility to check against, so just show the
        // synthetic-priced catalog as-is. With them, confirm each plan is actually quotable for
        // this age/trip via Bajaj's calculatepremium — a plan that isn't eligible (wrong age
        // band, unsupported area, etc.) never appears in the list at all, rather than showing
        // with a fallback estimate the customer couldn't actually buy.
        if (!(dep && ret && dob)) {
          setPlans(loadedPlans);
          setLoadingPlans(false);
          return;
        }

        setLoadingPlans(false);
        setCheckingEligibility(true);
        const eligible: Plan[] = [];
        await mapWithConcurrency(loadedPlans, 4, async plan => {
          try {
            const qs = new URLSearchParams({ plan: plan.name, dep, ret, dob, dest }).toString();
            const res = await fetch(`/api/insurance/premium?${qs}`);
            if (!res.ok || cancelled) return;
            const real = await res.json();
            if (cancelled || !real.totalPremium) return;
            eligible.push({ ...plan, premium: Math.round(real.totalPremium) });
          } catch {
            // not eligible / not quotable — excluded from the list
          }
        });
        if (cancelled) return;
        eligible.sort((a, b) => loadedPlans.findIndex(p => p.id === a.id) - loadedPlans.findIndex(p => p.id === b.id));
        setPlans(eligible);
        setCheckingEligibility(false);
      })
      .catch(() => {
        if (cancelled) return;
        setPlans([]);
        setLoadingPlans(false);
        setCheckingEligibility(false);
      });
    return () => { cancelled = true; };
  }, [sp, dep, ret, dob, dest]);

  /* filter state */
  const [supplierFilter, setSupplierFilter] = useState<string[]>([]);
  const [coverageFilter, setCoverageFilter] = useState<number[]>([]);
  const [sortBy, setSortBy]                 = useState<'premium'|'coverage'>('premium');

  const SUPPLIERS = [...new Set(plans.map(p => p.supplier))];

  const visible = plans
    .filter(p => supplierFilter.length === 0 || supplierFilter.includes(p.supplier))
    .filter(p => {
      if (coverageFilter.length === 0) return true;
      return coverageFilter.some(max => p.coverage <= max);
    })
    .sort((a, b) => sortBy === 'premium' ? a.premium - b.premium : b.coverage - a.coverage);

  /* supplier counts */
  const supplierCounts = SUPPLIERS.reduce((acc, s) => {
    acc[s] = plans.filter(p => p.supplier === s).length;
    return acc;
  }, {} as Record<string,number>);

  /* coverage bucket counts */
  const bucketCounts = COVERAGE_BUCKETS.map(b => ({
    ...b,
    count: plans.filter(p => p.coverage <= b.max).length,
  }));

  function handleSelect(plan: Plan) {
    // Matches the GST(18%) + Total Premium shown in this same card's expanded "Policy details"
    // panel — the amount carried into checkout must equal what was quoted there, not the
    // pre-GST premium.
    const gstPerHead = Math.round(plan.premium * 0.18);
    const totalPerHead = plan.premium + gstPerHead;
    const total = totalPerHead * adults;
    const params = new URLSearchParams({
      plan: plan.id, supplier: plan.supplier, planName: plan.name, logo: plan.logo,
      coverage: String(plan.coverage), premium: String(plan.premium),
      adults: String(adults), children: '0',
      dest, dep, ret, total: String(total), dob,
    });
    router.push(`/corporate/insurance/traveller-details?${params.toString()}`);
  }

  function toggleSupplier(s: string) {
    setSupplierFilter(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  }
  function toggleCoverage(max: number) {
    setCoverageFilter(p => p.includes(max) ? p.filter(x => x !== max) : [...p, max]);
  }

  return (
    <div className={inter.className} style={{ background:'#f2f2f2', minHeight:'100vh', color:'#1a1a2e' }}>

      {/* ── FULL-SCREEN SEARCH LOADER — matches the flight-search loader on /corporate/results ── */}
      {(loadingPlans || checkingEligibility) && (
        <div style={{
          position:'fixed', inset:0, zIndex:9999,
          background:'rgba(242,242,242,0.9)', backdropFilter:'blur(2px)',
          display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center', gap:18,
        }}>
          <div style={{ fontSize:52 }}>🛡️</div>
          <div style={{
            width:38, height:38, borderRadius:'50%',
            border:`3px solid ${O}33`, borderTopColor:O,
            animation:'spin .8s linear infinite',
          }} />
          <div style={{ fontSize:16, fontWeight:700, color:'#888' }}>
            {checkingEligibility ? 'Checking plan eligibility for your trip…' : 'Searching best insurance plans for you…'}
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* NAV */}
      <CorpHeader />

      {/* Insurance stepper */}
      <div style={{ background:`linear-gradient(90deg,${O},#e86d18)`, padding:'0 3%' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'12px 0' }}>
          <div style={{ display:'flex', justifyContent:'space-between', position:'relative' }}>
            <div style={{ position:'absolute', left:'4%', right:'4%',
              top:15, transform:'translateY(-50%)',
              height:2, background:'rgba(255,255,255,.35)', zIndex:0 }} />
            {STEPS.map((s, i) => (
              <div key={s} style={{ display:'flex', flexDirection:'column',
                alignItems:'center', gap:5, zIndex:1, minWidth:80 }}>
                <div style={{ width:30, height:30, borderRadius:'50%',
                  background: i <= 1 ? '#fff' : 'rgba(255,255,255,.2)',
                  border: i === 1 ? '2.5px solid #fff' : 'none',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:11, fontWeight:800,
                  color: i <= 1 ? O : 'rgba(255,255,255,.7)',
                  boxShadow: i === 1 ? '0 0 0 3px rgba(255,255,255,.25)' : 'none' }}>
                  {i === 0 ? '✓' : i + 1}
                </div>
                <span style={{ fontSize:9.5, whiteSpace:'nowrap', textAlign:'center',
                  fontWeight: i === 1 ? 700 : 400,
                  color: i <= 1 ? '#fff' : 'rgba(255,255,255,.6)' }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search params bar — editable, so the traveller can change criteria right here and
       * re-run the search without going back to the dashboard */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e0e0e0',
        boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
        <div style={{ maxWidth:1300, margin:'0 auto', padding:'0 2%',
          display:'flex', alignItems:'stretch', gap:0, flexWrap:'wrap' }}>

          <div style={{ flex:1, minWidth:150, padding:'10px 14px', borderRight:'1px solid #e8e8e8' }}>
            <div style={FIELD_LBL}>Insurance Type ▼</div>
            <select value={formType}
              onChange={e => {
                const v = e.target.value;
                setFormType(v);
                if (v === 'Individual' || v === 'Annual Multitrip') setFormAdults(1);
                else if (v === 'Family Floater') setFormAdults(p => p < 2 ? 2 : p > 6 ? 6 : p);
              }}
              style={FIELD_SELECT}>
              {INS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={{ flex:1, minWidth:150, padding:'10px 14px', borderRight:'1px solid #e8e8e8' }}>
            <div style={FIELD_LBL}>From ▼</div>
            <select value={formFrom} onChange={e => setFormFrom(e.target.value)} style={FIELD_SELECT}>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ flex:1, minWidth:150, padding:'10px 14px', borderRight:'1px solid #e8e8e8' }}>
            <div style={FIELD_LBL}>Destination ▼</div>
            <select value={formDest} onChange={e => setFormDest(e.target.value)} style={FIELD_SELECT}>
              {COUNTRIES.filter(c => c !== formFrom).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ flex:1, minWidth:130, padding:'10px 14px', borderRight:'1px solid #e8e8e8' }}>
            <div style={FIELD_LBL_PLAIN}>Start Date</div>
            <input type="date" value={formDep} min={new Date().toISOString().slice(0,10)}
              onChange={e => setFormDep(e.target.value)} style={FIELD_INPUT} />
          </div>

          <div style={{ flex:1, minWidth:130, padding:'10px 14px', borderRight:'1px solid #e8e8e8' }}>
            <div style={FIELD_LBL_PLAIN}>End Date</div>
            {formType === 'Annual Multitrip' ? (
              <input type="date" value={formRet} disabled
                style={{ ...FIELD_INPUT, cursor:'not-allowed', color:'#888' }} />
            ) : (
              <input type="date" value={formRet} min={formDep || new Date().toISOString().slice(0,10)}
                onChange={e => setFormRet(e.target.value)} style={FIELD_INPUT} />
            )}
          </div>

          <div style={{ flex:0.7, minWidth:90, padding:'10px 14px', borderRight:'1px solid #e8e8e8', background:'#fafaf8' }}>
            <div style={FIELD_LBL_PLAIN}>No of Days</div>
            <div style={{ fontSize:13.5, fontWeight:800, color: formNoDays > 0 ? '#1a1a2e' : '#bbb' }}>
              {formNoDays > 0 ? formNoDays : '—'}
            </div>
          </div>

          <div style={{ flex:1, minWidth:140, padding:'10px 14px', borderRight:'1px solid #e8e8e8' }}>
            <div style={FIELD_LBL}>Passengers{formType === 'Family Floater' ? ' ▼' : ''}</div>
            {formType === 'Family Floater' ? (
              <select value={formAdults} onChange={e => setFormAdults(Number(e.target.value))} style={FIELD_SELECT}>
                {[2,3,4,5,6].map(n => <option key={n} value={n}>{n} Passengers</option>)}
              </select>
            ) : (
              <div style={{ fontSize:13.5, fontWeight:800, color:'#1a1a2e' }}>1 Passenger</div>
            )}
          </div>

          <div style={{ flex:1, minWidth:140, padding:'10px 14px' }}>
            <div style={FIELD_LBL_PLAIN}>Date of Birth</div>
            {formType === 'Family Floater' ? (
              <TravelerPopover countOptions={[2,3,4,5,6]} count={formAdults} onCountChange={setFormAdults}
                travelers={formTravelers} onChange={setFormTravelers} showRelationship
                showErrors={showFormErrors} />
            ) : (
              <>
                <input type="date" value={formDob} max={new Date().toISOString().slice(0,10)}
                  onChange={e => setFormDob(e.target.value)} style={FIELD_INPUT} />
                {!formDob && (
                  showFormErrors ? (
                    <div style={{ marginTop:4, background:'#c0392b', borderRadius:5,
                      padding:'3px 9px', display:'inline-block' }}>
                      <span style={{ fontSize:9.5, fontWeight:700, color:'#fff' }}>
                        *Date of Birth is required
                      </span>
                    </div>
                  ) : (
                    <div style={{ fontSize:9.5, color:'#aaa', fontWeight:600 }}>* mandatory</div>
                  )
                )}
              </>
            )}
          </div>

          {/* Search */}
          <div style={{ display:'flex', alignItems:'center', padding:'10px 18px', flexShrink:0 }}>
            <button onClick={handleModifySearch} style={{ padding:'10px 28px', background:GR, color:'#fff',
              border:'none', borderRadius:8, fontSize:13.5, fontWeight:800,
              cursor:'pointer', fontFamily:'inherit', boxShadow:`0 3px 10px ${GR}44`, whiteSpace:'nowrap' }}>
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ display:'flex', maxWidth:1300, margin:'0 auto', padding:'20px 2%', gap:20, alignItems:'flex-start' }}>

        {/* LEFT SIDEBAR */}
        <div style={{ width:240, flexShrink:0, background:'#fff', borderRadius:10,
          border:'1.5px solid #e0e0e0', padding:'18px 16px', position:'sticky', top:108 }}>
          <div style={{ fontSize:14, fontWeight:800, color:'#1a1a2e', marginBottom:16,
            paddingBottom:10, borderBottom:'1px solid #f0f0f0' }}>
            Filter Your Search
          </div>

          {/* Insurance Supplier */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:10, fontWeight:800, color:'#999', letterSpacing:'.09em',
              textTransform:'uppercase', marginBottom:10 }}>Insurance Supplier</div>
            {SUPPLIERS.map(s => (
              <label key={s} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                marginBottom:9, cursor:'pointer' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <input type="checkbox" checked={supplierFilter.includes(s)}
                    onChange={() => toggleSupplier(s)}
                    style={{ width:14, height:14, accentColor:O, cursor:'pointer' }} />
                  <span style={{ fontSize:12.5, color:'#333', fontWeight:500 }}>{s}</span>
                </div>
                <span style={{ fontSize:11.5, color:'#999', fontWeight:600 }}>({supplierCounts[s]})</span>
              </label>
            ))}
          </div>

          {/* Coverage / Sum Assured */}
          <div style={{ paddingTop:14, borderTop:'1px solid #f0f0f0' }}>
            <div style={{ fontSize:10, fontWeight:800, color:'#999', letterSpacing:'.09em',
              textTransform:'uppercase', marginBottom:10 }}>Coverage / Sum Assured</div>
            {bucketCounts.map(b => (
              <label key={b.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                marginBottom:9, cursor:'pointer' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <input type="checkbox" checked={coverageFilter.includes(b.max)}
                    onChange={() => toggleCoverage(b.max)}
                    style={{ width:14, height:14, accentColor:O, cursor:'pointer' }} />
                  <span style={{ fontSize:12, color:'#333', fontWeight:500 }}>{b.label}</span>
                </div>
                <span style={{ fontSize:11.5, color:'#999', fontWeight:600 }}>({b.count})</span>
              </label>
            ))}
          </div>
        </div>

        {/* MAIN */}
        <div style={{ flex:1, minWidth:0 }}>

          {/* Tab */}
          <div style={{ background:'#fff', borderRadius:10, border:'1.5px solid #e0e0e0',
            marginBottom:14, padding:'0 20px' }}>
            <div style={{ display:'flex', gap:0 }}>
              <div style={{ padding:'13px 4px', fontSize:13, fontWeight:800, color:O,
                borderBottom:`3px solid ${O}`, marginRight:24, cursor:'pointer',
                letterSpacing:'.04em', textTransform:'uppercase' }}>
                {insType}
              </div>
            </div>
          </div>

          {/* Results bar */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            marginBottom:12, padding:'0 4px' }}>
            <span style={{ fontSize:12.5, color:'#666', fontWeight:500 }}>
              Showing <strong style={{ color:'#1a1a2e' }}>{visible.length}</strong> of {plans.length} policy found
            </span>
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              <span style={{ fontSize:12, fontWeight:700, color:'#888', textTransform:'uppercase',
                letterSpacing:'.06em' }}>Sort By :</span>
              <button onClick={() => setSortBy('premium')}
                style={{ background:'none', border:'none', cursor:'pointer', fontFamily:'inherit',
                  fontSize:12.5, fontWeight:700, color: sortBy==='premium' ? '#1a1a2e' : '#aaa',
                  borderBottom: sortBy==='premium' ? '2px solid #1a1a2e' : '2px solid transparent',
                  paddingBottom:2 }}>
                Premium Amount {sortBy==='premium' ? '↓' : ''}
              </button>
              <button onClick={() => setSortBy('coverage')}
                style={{ background:'none', border:'none', cursor:'pointer', fontFamily:'inherit',
                  fontSize:12.5, fontWeight:700, color: sortBy==='coverage' ? '#1a1a2e' : '#aaa',
                  borderBottom: sortBy==='coverage' ? '2px solid #1a1a2e' : '2px solid transparent',
                  paddingBottom:2 }}>
                Coverage Amount {sortBy==='coverage' ? '↓' : ''}
              </button>
            </div>
          </div>

          {/* Plan cards */}
          {loadingPlans || checkingEligibility ? null : plans.length === 0 ? (
            <div style={{ background:'#fff', borderRadius:10, padding:'40px', textAlign:'center',
              border:'1.5px solid #e0e0e0', color:'#aaa', fontSize:14 }}>
              No eligible plans found for your trip dates and traveller age. Try changing your search.
            </div>
          ) : visible.length === 0 ? (
            <div style={{ background:'#fff', borderRadius:10, padding:'40px', textAlign:'center',
              border:'1.5px solid #e0e0e0', color:'#aaa', fontSize:14 }}>
              No policies match your filters. Try removing some filters.
            </div>
          ) : visible.map(plan => (
            <PlanCard key={plan.id} plan={plan} onSelect={() => handleSelect(plan)} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PlansPage() {
  return <Suspense><PlansContent /></Suspense>;
}
