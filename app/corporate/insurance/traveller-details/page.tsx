'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Inter, Playfair_Display } from 'next/font/google';
import { getPlanById, supplierColor, SUPPLIER_LABELS, type ProposerForm, type TravellerForm } from '../insuranceData';
import CorpHeader from '../../components/CorpHeader';

const inter    = Inter({ subsets: ['latin'], weight: ['400','500','600','700','800'] });
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'], style: ['italic'] });

const O  = '#f07820';
const STEPS = ['Plan Search', 'Select Plan', 'Traveller Details', 'Payment', 'Policy Issued'];
const ACTIVE = 2;

const INP: React.CSSProperties = {
  width: '100%', padding: '10px 13px', border: '1.5px solid #d0d0d0',
  borderRadius: 6, fontSize: 13, color: '#1a1a2e', outline: 'none',
  background: '#fff', fontFamily: 'inherit', boxSizing: 'border-box',
};
const SEL: React.CSSProperties = {
  ...INP,
  appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='7' viewBox='0 0 11 7'%3E%3Cpath d='M1 1l4.5 4.5L10 1' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: 34,
};
const ERR: React.CSSProperties = { border: '1.5px solid #e02424', background: '#fff5f5' };
function fieldStyle(base: React.CSSProperties, invalid: boolean): React.CSSProperties {
  return invalid ? { ...base, ...ERR } : base;
}

const PLAN_HIGHLIGHTS = [
  'We understand that this policy does not cover any pre-existing medical condition/injury/illness/deformity and complications arising from them that are declared or undeclared.',
  'Covers hospitalisation & medical expenses',
  'Covers loss of baggage/passport',
  'Covers flight delays & trip cancellations',
  'Cashless medical facility abroad',
];

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh','Puducherry',
];

const NATIONALITIES = ['Indian','American','British','Australian','Canadian','German','French','Japanese','Other'];

function emptyTraveller(id: number, isChild = false): TravellerForm {
  return { id, title: isChild ? 'Master' : 'Mr', firstName: '', lastName: '', dob: '',
    passport: '', relationship: id === 1 ? 'SELF' : isChild ? 'CHILD' : '',
    nationality: 'Indian', nomineeFirst: '', nomineeLast: '' };
}

function fmtDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

function daysBetween(dep: string, ret: string) {
  if (!dep || !ret) return 0;
  return Math.max(0, Math.round((new Date(ret).getTime() - new Date(dep).getTime()) / 86400000));
}

/* Floating-label wrapper for dropdowns */
function FloatSelect({ label, value, onChange, options, style, invalid }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; style?: React.CSSProperties;
  invalid?: boolean;
}) {
  return (
    <div style={{ position: 'relative', ...style }}>
      <span style={{ position: 'absolute', top: -8, left: 10, background: '#fff',
        padding: '0 4px', fontSize: 10, color: invalid ? '#e02424' : '#888', zIndex: 1, pointerEvents: 'none' }}>
        {label}
      </span>
      <select value={value} onChange={e => onChange(e.target.value)} style={fieldStyle(SEL, !!invalid)}>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

function TravellerDetailsContent() {
  const router   = useRouter();
  const sp       = useSearchParams();
  const planId   = sp.get('plan')     || '';
  const adults   = parseInt(sp.get('adults')   || '1');
  const children = parseInt(sp.get('children') || '0');
  const dest     = sp.get('dest') || '';
  const dep      = sp.get('dep')  || '';
  const ret      = sp.get('ret')  || '';
  const total    = parseInt(sp.get('total') || '0');

  const plan      = getPlanById(planId);
  const planName  = sp.get('planName') || plan?.name || 'Travel Insurance Plan';
  const supplier  = sp.get('supplier') || plan?.supplier || 'Insurance';
  const planLogo  = sp.get('logo') || plan?.logo || '';
  const coverage  = parseInt(sp.get('coverage') || String(plan?.coverage ?? 0), 10);

  const color = supplierColor(planLogo || plan?.logo || '');
  const lbl = planLogo
    ? (SUPPLIER_LABELS[planLogo] ?? { line1: 'INS', line2: '' })
    : plan ? (SUPPLIER_LABELS[plan.logo] ?? { line1: 'INS', line2: '' }) : { line1: 'INS', line2: '' };

  const totalTravellers = Math.max(1, adults + children);
  const baseFare  = Math.round(total / 1.18);
  const gstAmt    = total - baseFare;
  const strikeAmt = Math.round(total * 0.927);
  const noDays     = daysBetween(dep, ret);

  const [showPlan, setShowPlan] = useState(true);

  const [proposer, setProposer] = useState<ProposerForm>({
    nationality: 'Indian', mobile: '', email: '',
    address1: '', address2: '', state: '', district: '', city: '', pincode: '', gst: '',
  });
  const [travellers, setTravellers] = useState<TravellerForm[]>(
    Array.from({ length: totalTravellers }, (_, i) => emptyTraveller(i + 1, i >= adults))
  );

  function updProp(f: keyof ProposerForm, v: string) {
    setProposer(p => ({ ...p, [f]: v }));
  }
  function updTrav(id: number, f: keyof TravellerForm, v: string) {
    setTravellers(p => p.map(t => t.id === id ? { ...t, [f]: v } : t));
  }

  /* ── Mandatory-field validation ── */
  const [showErrors, setShowErrors] = useState(false);

  const mobileValid = /^\d{7,15}$/.test(proposer.mobile.trim());
  const emailValid  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(proposer.email.trim());
  const pincodeValid = /^\d{6}$/.test(proposer.pincode.trim());
  const proposerValid = mobileValid && emailValid && pincodeValid
    && !!proposer.address1.trim() && !!proposer.state && !!proposer.district.trim() && !!proposer.city.trim();

  function isTravellerValid(t: TravellerForm): boolean {
    return !!t.firstName.trim() && !!t.lastName.trim() && !!t.dob
      && !!t.passport.trim() && !!t.relationship
      && !!t.nomineeFirst.trim() && !!t.nomineeLast.trim();
  }
  const travellersValid = travellers.every(isTravellerValid);
  const formValid = proposerValid && travellersValid;

  function handleProceed() {
    if (!formValid) {
      setShowErrors(true);
      const target = !proposerValid ? 'proposer-details' : 'traveller-info';
      document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const params = new URLSearchParams({
      plan: planId, supplier: supplier, planName: planName, logo: planLogo,
      coverage: String(coverage), premium: String(plan?.premium ?? 0),
      adults: String(adults), children: String(children),
      dest, dep, ret, total: String(total),
      proposer: JSON.stringify(proposer),
      travellers: JSON.stringify(travellers),
    });
    router.push(`/corporate/insurance/payment?${params.toString()}`);
  }

  return (
    <div className={inter.className} style={{ background: '#ebebeb', minHeight: '100vh', color: '#1a1a2e' }}>

      {/* NAV */}
      <CorpHeader />

      {/* Stepper */}
      <div style={{ background: `linear-gradient(90deg,${O},#e86d18)`, padding: '0 3%' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '12px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '4%', right: '4%',
              top: 15, transform: 'translateY(-50%)',
              height: 2, background: 'rgba(255,255,255,.35)', zIndex: 0 }} />
            {STEPS.map((s, i) => (
              <div key={s} style={{ display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 5, zIndex: 1, minWidth: 80 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%',
                  background: i <= ACTIVE ? '#fff' : 'rgba(255,255,255,.2)',
                  border: i === ACTIVE ? '2.5px solid #fff' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800,
                  color: i <= ACTIVE ? O : 'rgba(255,255,255,.7)',
                  boxShadow: i === ACTIVE ? '0 0 0 3px rgba(255,255,255,.25)' : 'none' }}>
                  {i < ACTIVE ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 9.5, whiteSpace: 'nowrap', textAlign: 'center',
                  fontWeight: i === ACTIVE ? 700 : 400,
                  color: i <= ACTIVE ? '#fff' : 'rgba(255,255,255,.6)' }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 3%',
        display: 'flex', gap: 22, alignItems: 'flex-start' }}>

        {/* ── LEFT ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Heading row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#1a1a2e' }}>Review your policy</h2>
            <Link href="/corporate/insurance/plans"
              style={{ textDecoration: 'none', fontSize: 13, color: '#2a6fcc', fontWeight: 600 }}>
              ← Back to Search
            </Link>
          </div>

          {/* Plan review card */}
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #ddd',
            boxShadow: '0 1px 5px rgba(0,0,0,.06)', marginBottom: 20, overflow: 'hidden' }}>

            {/* Date / destination bar */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', gap: 0,
              borderBottom: showPlan ? '1px solid #efefef' : 'none' }}>

              {/* Start */}
              <div style={{ marginRight: 18, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: '#aaa', fontWeight: 600, marginBottom: 2 }}>Start Date</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a2e', whiteSpace: 'nowrap' }}>
                  {dep ? fmtDate(dep) : '—'}
                </div>
              </div>
              <div style={{ width: 1, height: 34, background: '#e0e0e0', marginRight: 18, flexShrink: 0 }} />

              {/* End */}
              <div style={{ marginRight: 18, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: '#aaa', fontWeight: 600, marginBottom: 2 }}>End Date</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a2e', whiteSpace: 'nowrap' }}>
                  {ret ? fmtDate(ret) : '—'}
                </div>
              </div>
              <div style={{ width: 1, height: 34, background: '#e0e0e0', marginRight: 18, flexShrink: 0 }} />

              {/* Destination + days */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#1a1a2e' }}>{dest || 'Worldwide'}</span>
                {noDays > 0 && (
                  <span style={{ fontSize: 12, color: '#888', marginLeft: 12 }}>No. of days: {noDays}</span>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12.5, color: '#2a6fcc', fontWeight: 600, fontFamily: 'inherit', padding: 0 }}>
                  Policy Wording
                </button>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12.5, color: '#2a6fcc', fontWeight: 600, fontFamily: 'inherit', padding: 0 }}>
                  View Plan Details
                </button>
                <button onClick={() => setShowPlan(p => !p)}
                  style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid #d8d8d8',
                    background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 13, color: '#555',
                    transform: showPlan ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform .2s' }}>
                  ▼
                </button>
              </div>
            </div>

            {/* Expanded detail */}
            {showPlan && (
              <div style={{ padding: '16px 20px' }}>
                {/* Insurer + stats row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 12 }}>
                  <div style={{ width: 54, height: 42, borderRadius: 6, background: color, flexShrink: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{lbl.line1}</span>
                    <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,.85)', lineHeight: 1.2 }}>{lbl.line2}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 40 }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#aaa', fontWeight: 600, marginBottom: 2 }}>Relation</div>
                      <div style={{ fontSize: 14, fontWeight: 800 }}>SELF</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: '#aaa', fontWeight: 600, marginBottom: 2 }}>Total Premium</div>
                      <div style={{ fontSize: 14, fontWeight: 800 }}>₹{total.toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: '#aaa', fontWeight: 600, marginBottom: 2 }}>Coverage</div>
                      <div style={{ fontSize: 14, fontWeight: 800 }}>
                        {plan ? '$' + plan.coverage.toLocaleString('en-US') : '—'}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 12 }}>
                  {plan?.name ?? 'Travel Insurance Plan'}
                </div>

                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {PLAN_HIGHLIGHTS.map((h, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: '#555', lineHeight: 1.55 }}>
                      <span style={{ color: '#f0a020', fontSize: 9, marginTop: 4, flexShrink: 0 }}>●</span>
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* ── Proposer Details ── */}
          <h3 id="proposer-details" style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, color: '#1a1a2e' }}>Proposer Details</h3>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 18 }}>
            Complete proposer and contact information. This information is used for policy issuance and communication.
          </div>
          {showErrors && !proposerValid && (
            <div style={{ background: '#fdeef1', border: '1px solid #f3c6d0', borderRadius: 8,
              padding: '10px 14px', marginBottom: 14, fontSize: 12.5, color: '#c9184a', fontWeight: 600 }}>
              Please fill all mandatory fields (marked *) in Proposer Details — check mobile number,
              email, pincode, and address fields are valid.
            </div>
          )}
          <div style={{ background: '#fff', borderRadius: 10, padding: '22px 22px 20px',
            border: '1px solid #ddd', boxShadow: '0 1px 4px rgba(0,0,0,.04)', marginBottom: 22 }}>

            {/* Nationality */}
            <div style={{ marginBottom: 18 }}>
              <FloatSelect
                label="Nationality"
                value={proposer.nationality}
                onChange={v => updProp('nationality', v)}
                options={NATIONALITIES}
                style={{ maxWidth: 240 }}
              />
            </div>

            {/* Mobile + Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <input placeholder="Mobile Number*" value={proposer.mobile}
                onChange={e => updProp('mobile', e.target.value)}
                style={fieldStyle(INP, showErrors && !mobileValid)} />
              <input placeholder="Email ID*" value={proposer.email}
                onChange={e => updProp('email', e.target.value)}
                style={fieldStyle(INP, showErrors && !emailValid)} />
            </div>

            {/* Address */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <textarea placeholder="Enter Address*" value={proposer.address1}
                onChange={e => updProp('address1', e.target.value)}
                rows={2} style={fieldStyle({ ...INP, resize: 'vertical' as const }, showErrors && !proposer.address1.trim())} />
              <textarea placeholder="Enter Address" value={proposer.address2}
                onChange={e => updProp('address2', e.target.value)}
                rows={2} style={{ ...INP, resize: 'vertical' as const }} />
            </div>

            {/* State / District / City / Pincode */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
              <select value={proposer.state} onChange={e => updProp('state', e.target.value)}
                style={fieldStyle(SEL, showErrors && !proposer.state)}>
                <option value="">State*</option>
                {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
              </select>
              <input placeholder="District*" value={proposer.district}
                onChange={e => updProp('district', e.target.value)}
                style={fieldStyle(INP, showErrors && !proposer.district.trim())} />
              <input placeholder="City*" value={proposer.city}
                onChange={e => updProp('city', e.target.value)}
                style={fieldStyle(INP, showErrors && !proposer.city.trim())} />
              <input placeholder="Pincode*" value={proposer.pincode}
                onChange={e => updProp('pincode', e.target.value)}
                style={fieldStyle(INP, showErrors && !pincodeValid)} />
            </div>

            {/* GST */}
            <input placeholder="GST Number (Optional)" value={proposer.gst}
              onChange={e => updProp('gst', e.target.value)}
              style={{ ...INP, maxWidth: 260 }} />
          </div>

          {/* ── Traveller Information ── */}
          <h3 id="traveller-info" style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: '#1a1a2e' }}>Traveller Information</h3>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 18 }}>
            Fill in each traveller's details for policy issuance. Adults and children are shown below based on your search selection.
          </div>
          {showErrors && !travellersValid && (
            <div style={{ background: '#fdeef1', border: '1px solid #f3c6d0', borderRadius: 8,
              padding: '10px 14px', marginBottom: 14, fontSize: 12.5, color: '#c9184a', fontWeight: 600 }}>
              Please fill all mandatory fields (marked *) for every traveller, including passport,
              relationship, and nominee details.
            </div>
          )}

          {travellers.map((t, idx) => {
            const isChild = idx >= adults;
            return (
              <div key={t.id} style={{ background: '#fff', borderRadius: 10, padding: '18px 22px 20px',
                border: '1px solid #ddd', boxShadow: '0 1px 4px rgba(0,0,0,.04)', marginBottom: 14 }}>

                <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1a2e', marginBottom: 16 }}>
                  Traveller {idx + 1}
                  {isChild && (
                    <span style={{ fontSize: 11, fontWeight: 500, color: '#888', marginLeft: 8 }}>Child</span>
                  )}
                </div>

                {/* Row 1: Title | First | Last | DOB */}
                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 190px', gap: 12, marginBottom: 14 }}>
                  <FloatSelect
                    label="Title*"
                    value={t.title}
                    onChange={v => updTrav(t.id, 'title', v)}
                    options={isChild ? ['Master','Miss'] : ['Mr','Mrs','Ms','Dr']}
                  />
                  <input placeholder="First Name*" value={t.firstName}
                    onChange={e => updTrav(t.id, 'firstName', e.target.value)}
                    style={fieldStyle(INP, showErrors && !t.firstName.trim())} />
                  <input placeholder="Last Name*" value={t.lastName}
                    onChange={e => updTrav(t.id, 'lastName', e.target.value)}
                    style={fieldStyle(INP, showErrors && !t.lastName.trim())} />
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', top: -8, left: 10, background: '#fff',
                      padding: '0 4px', fontSize: 10, color: showErrors && !t.dob ? '#e02424' : '#888', zIndex: 1 }}>Date of Birth*</span>
                    <input type="date" value={t.dob}
                      onChange={e => updTrav(t.id, 'dob', e.target.value)}
                      style={fieldStyle({ ...INP, paddingTop: 11 }, showErrors && !t.dob)} />
                  </div>
                </div>

                {/* Row 2: Passport | Relationship | Nationality */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 18 }}>
                  <input placeholder="Passport Number*" value={t.passport}
                    onChange={e => updTrav(t.id, 'passport', e.target.value)}
                    style={fieldStyle(INP, showErrors && !t.passport.trim())} />
                  <FloatSelect
                    label="Relationship *"
                    value={t.relationship}
                    onChange={v => updTrav(t.id, 'relationship', v)}
                    options={['','SELF','SPOUSE','PARENT','CHILD','SIBLING','FRIEND']}
                    invalid={showErrors && !t.relationship}
                  />
                  <FloatSelect
                    label="Nationality"
                    value={t.nationality}
                    onChange={v => updTrav(t.id, 'nationality', v)}
                    options={NATIONALITIES}
                  />
                </div>

                {/* Nominee Details */}
                <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 10 }}>
                  Nominee Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <input placeholder="Nominee First Name*" value={t.nomineeFirst}
                    onChange={e => updTrav(t.id, 'nomineeFirst', e.target.value)}
                    style={fieldStyle(INP, showErrors && !t.nomineeFirst.trim())} />
                  <input placeholder="Nominee Last Name*" value={t.nomineeLast}
                    onChange={e => updTrav(t.id, 'nomineeLast', e.target.value)}
                    style={fieldStyle(INP, showErrors && !t.nomineeLast.trim())} />
                </div>
              </div>
            );
          })}

          {/* Proceed */}
          <button onClick={handleProceed}
            style={{ width: '100%', padding: '14px 0', marginTop: 4,
              background: `linear-gradient(135deg,${O},#e86d18)`,
              color: '#fff', border: 'none', borderRadius: 9,
              fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: `0 4px 18px ${O}44` }}>
            Proceed to Payment →
          </button>
        </div>

        {/* ── RIGHT — Fare Details ── */}
        <div style={{ width: 270, flexShrink: 0, position: 'sticky', top: 66 }}>

          <h2 style={{ margin: '0 0 14px', fontSize: 19, fontWeight: 800, color: '#1a1a2e' }}>Fare Details</h2>

          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #ddd',
            boxShadow: '0 1px 6px rgba(0,0,0,.07)' }}>

            <div style={{ padding: '16px 18px' }}>
              {[
                { label: 'Base Fare', val: baseFare },
                { label: 'Taxes',     val: gstAmt   },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: '#555' }}>{r.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>₹{r.val.toLocaleString()}</span>
                </div>
              ))}

              <div style={{ height: 1, background: '#e4e4e4', margin: '14px 0' }} />

              {/* Policy Premium */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 13.5, fontWeight: 800, color: '#1a1a2e' }}>Policy Premium</span>
                <div>
                  <span style={{ fontSize: 12, color: '#bbb', textDecoration: 'line-through', marginRight: 6 }}>
                    ₹{strikeAmt.toLocaleString()}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e' }}>
                    ₹{total.toLocaleString()}
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function TravellerDetailsPage() {
  return <Suspense><TravellerDetailsContent /></Suspense>;
}
