'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Inter, Playfair_Display } from 'next/font/google';
import BookingProgress from '../components/BookingProgress';
import CorpHeader from '../components/CorpHeader';
import CorpFooter from '../components/CorpFooter';
import { PriceChangeNotice } from '../components/PriceChangeNotice';
import { useFlightPriceCheck, type PriceCheckLeg } from '../../hooks/useFlightPriceCheck';
import { sanitizeCompanyName, sanitizeAlphanumeric, sanitizeDigits, sanitizeAddress } from '../../lib/textSanitize';
import { useCurrentUser } from '../../hooks/useCurrentUser';

const inter    = Inter({ subsets:['latin'], weight:['400','500','600','700','800'] });
const playfair = Playfair_Display({ subsets:['latin'], weight:['700'], style:['italic'] });

const O  = '#f07820';
const O2 = '#e86d18';
const PK = '#c9184a';

/* ─── Types ─── */
type TravellerKind = 'adult' | 'child' | 'infant';
type SlotForm = {
  id: number; title: string; firstName: string; lastName: string; dob?: string;
  passport?: string; nationality?: string; issuingCountry?: string;
  passportIssue?: string; passportExpiry?: string;
  ffAirline?: string; ffNumber?: string;
};
type FlightSeg = {
  label: 'outward' | 'return';
  from: string; to: string;
  /** Airport codes (e.g. "JAI"/"DEL") for the on-screen route labels. */
  fromCode: string; toCode: string;
  date: string; stops: string; dur: string;
  airlineCode: string; flightCode: string; aircraft: string;
  dep: string; arr: string;
  depTerminal: string; arrTerminal: string;
  price?: number; // real per-adult fare carried over from results — undefined for demo segments
};

/* ─── Constants ─── */
const TITLES = ['Mr', 'Mrs', 'Ms', 'Dr', 'Master'];
const TODAY_ISO = new Date().toISOString().slice(0, 10);
const TOMORROW_ISO = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

// Per-flight, per-pax base + tax rates
const PAX_RATE = {
  adult:  { base: 1559, tax: 1720 },
  child:  { base: 1159, tax: 1420 },
  infant: { base:  499, tax:  580 },
} as const;

const SEGMENTS: FlightSeg[] = [
  {
    label: 'outward',
    from: 'Jaipur', to: 'New Delhi', fromCode: 'JAI', toCode: 'DEL',
    date: 'Thursday, Jul 30', stops: 'Non Stop', dur: '1 h 5 m',
    airlineCode: '6E', flightCode: '6E-6492', aircraft: 'Airbus A321',
    dep: '17:15', arr: '18:20',
    depTerminal: 'Jaipur, Sanganeer, Terminal T-2',
    arrTerminal: 'New Delhi, Indira Gandhi International Airport, Terminal T-1',
  },
  {
    label: 'return',
    from: 'New Delhi', to: 'Jaipur', fromCode: 'DEL', toCode: 'JAI',
    date: 'Friday, Jul 31', stops: 'Non Stop', dur: '1 h',
    airlineCode: '6E', flightCode: '6E-6190', aircraft: 'Airbus A320-100',
    dep: '07:40', arr: '08:40',
    depTerminal: 'New Delhi, Indira Gandhi International Airport, Terminal T-1',
    arrTerminal: 'Jaipur, Sanganeer, Terminal T-2',
  },
];

const INTL_SEGMENTS: FlightSeg[] = [
  {
    label: 'outward',
    from: 'New Delhi', to: 'Bangkok', fromCode: 'DEL', toCode: 'BKK',
    date: 'Thursday, Jul 30', stops: 'Non Stop', dur: '5 h',
    airlineCode: '6E', flightCode: '6E-1401', aircraft: 'Airbus A321',
    dep: '23:30', arr: '05:30',
    depTerminal: 'New Delhi, Indira Gandhi International Airport, Terminal T-3',
    arrTerminal: 'Bangkok Suvarnabhumi International Airport, Terminal D',
  },
  {
    label: 'return',
    from: 'Bangkok', to: 'New Delhi', fromCode: 'BKK', toCode: 'DEL',
    date: 'Friday, Aug 6', stops: 'Non Stop', dur: '4 h 30 m',
    airlineCode: '6E', flightCode: '6E-1402', aircraft: 'Airbus A321',
    dep: '06:30', arr: '10:00',
    depTerminal: 'Bangkok Suvarnabhumi International Airport, Terminal D',
    arrTerminal: 'New Delhi, Indira Gandhi International Airport, Terminal T-3',
  },
];

const INTL_PAX_RATE = {
  adult:  { base: 14200, tax: 4250 },
  child:  { base: 11500, tax: 3500 },
  infant: { base:  2800, tax:  800 },
} as const;

/* ─── Shared input/label styles ─── */
const INP: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1.5px solid #e8e0e0',
  borderRadius: 7, fontSize: 13, color: '#1a1a2e', outline: 'none',
  background: '#fff', fontFamily: 'inherit', boxSizing: 'border-box',
};
const LBL: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: '#999', letterSpacing: '.07em',
  textTransform: 'uppercase', display: 'block', marginBottom: 5,
};

/* ─── Airline Logo ─── */
function AirlineLogo({ code, size = 40, radius = 9 }: { code: string; size?: number; radius?: number }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div style={{ width: size, height: size, borderRadius: radius, background: '#003580',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.275, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{code}</div>
    );
  }

  return (
    <img
      src={`/airline_icons/${code}.png`}
      alt={code}
      onError={() => setFailed(true)}
      style={{ width: size, height: size, borderRadius: radius, objectFit: 'contain',
        background: '#fff', border: '1px solid #f0ecea', flexShrink: 0 }}
    />
  );
}

/* ─── Flight Itinerary Card ─── */
function FlightCard({ seg, index = 0, isMulti = false }: { seg: FlightSeg; index?: number; isMulti?: boolean }) {
  const isReturn  = seg.label === 'return';
  const accent    = isMulti ? (index % 2 === 0 ? O : PK) : (isReturn ? PK : O);
  const badgeText = isMulti ? `SECTOR ${index + 1}` : (isReturn ? 'RETURN FLIGHT' : 'OUTWARD FLIGHT');
  const dateBg    = accent === PK ? '#fce8ee' : '#fff3e0';
  const dateColor = accent === PK ? PK : '#c8622a';

  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '16px 20px',
      border: '1px solid #f0e8e8', boxShadow: '0 2px 12px rgba(0,0,0,.05)',
      borderTop: `3px solid ${accent}`,
    }}>
      {/* Top label row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center',
          background: accent === PK ? '#fce8ee' : `${O}12`,
          border: `1px solid ${accent === PK ? '#f5c0cc' : `${O}44`}`,
          borderRadius: 5, padding: '2px 10px' }}>
          <span style={{ fontSize: 9.5, fontWeight: 800, color: accent,
            letterSpacing: '.1em', textTransform: 'uppercase' }}>{badgeText}</span>
        </div>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 11, color: PK, fontWeight: 700, letterSpacing: '.05em', padding: 0 }}>
          CANCELLATION FEES APPLY
        </button>
      </div>

      {/* Main row: airline badge LEFT — route + timing CENTER/RIGHT */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 12 }}>

        {/* Airline badge column */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <AirlineLogo code={seg.airlineCode} />
          <span style={{ fontSize: 10, color: '#888', fontWeight: 600, textAlign: 'center' }}>{seg.flightCode}</span>
          <span style={{ fontSize: 9.5, color: '#aaa', background: '#f5f5f5',
            padding: '1px 6px', borderRadius: 10, fontWeight: 500, whiteSpace: 'nowrap' }}>{seg.aircraft}</span>
        </div>

        {/* Route + timing */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e', marginBottom: 5 }}>
            {seg.from} ({seg.fromCode}) → {seg.to} ({seg.toCode})
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ background: dateBg, color: dateColor, fontSize: 11, fontWeight: 700,
              padding: '2px 9px', borderRadius: 5 }}>{seg.date}</span>
            <span style={{ fontSize: 12, color: '#555', fontWeight: 500 }}>{seg.stops} · {seg.dur}</span>
          </div>

          {/* Timeline */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%',
                border: `2px solid ${accent}`, background: '#fff', marginTop: 4 }} />
              <div style={{ width: 1.5, flex: 1, background: '#ddd', margin: '3px 0' }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%',
                border: `2px solid ${accent}`, background: '#fff', marginBottom: 2 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#1a1a2e' }}>{seg.dep}</span>
                <span style={{ fontSize: 11.5, color: '#666' }}>{seg.depTerminal}</span>
              </div>
              <div style={{ fontSize: 11, color: accent, fontWeight: 600, padding: '5px 0' }}>{seg.dur}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#1a1a2e' }}>{seg.arr}</span>
                <span style={{ fontSize: 11.5, color: '#666' }}>{seg.arrTerminal}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Baggage */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, paddingTop: 10,
        borderTop: '1px solid #f0e8e8' }}>
        <span style={{ fontSize: 11.5, color: '#888' }}>
          <span style={{ color: '#555', fontWeight: 600 }}>Baggage</span> ADULT
        </span>
        <span style={{ fontSize: 11.5, color: '#888' }}>
          <span style={{ color: accent, fontWeight: 600 }}>Check-in</span> 15 kgs (1 piece only) / Adult
        </span>
        <span style={{ fontSize: 11.5, color: '#888' }}>
          <span style={{ color: accent, fontWeight: 600 }}>Cabin</span> 5-7 Kgs (1 piece only)
        </span>
      </div>
    </div>
  );
}

const ERR_INP: React.CSSProperties = { border: '1.5px solid #e02424', background: '#fff5f5' };
function fieldStyle(base: React.CSSProperties, invalid: boolean): React.CSSProperties {
  return invalid ? { ...base, ...ERR_INP } : base;
}

/* ─── Traveller Section ─── */
function TravellerSection({
  label, ageRange, kind, required, slots, setSlots, isIntl, showErrors,
}: {
  label: string; ageRange: string; kind: TravellerKind; required: number;
  slots: SlotForm[]; setSlots: React.Dispatch<React.SetStateAction<SlotForm[]>>;
  isIntl?: boolean; showErrors: boolean;
}) {
  const kindNoun = kind === 'adult' ? 'adults' : kind === 'child' ? 'children' : 'infants';
  const total    = Math.max(required, slots.length);

  function addSlot() {
    setSlots(p => [...p, { id: Date.now(), title: '', firstName: '', lastName: '' }]);
  }
  function removeSlot(id: number) {
    setSlots(p => p.filter(s => s.id !== id));
  }
  function update(id: number, field: keyof SlotForm, val: string) {
    setSlots(p => p.map(s => s.id === id ? { ...s, [field]: val } : s));
  }

  return (
    <div style={{ border: '1px solid #f0e8e8', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '13px 18px', background: '#fff', borderBottom: '1px solid #f0e8e8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 16, height: 16, border: '1.5px solid #ccc', borderRadius: 3 }} />
          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1a1a2e' }}>
            {label} <span style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>({ageRange})</span>
          </span>
        </div>
        <span style={{
          fontSize: 12, fontWeight: 700,
          color: slots.length >= required && required > 0 ? '#2d8a4e' : O,
          background: slots.length >= required && required > 0 ? 'rgba(45,138,78,.09)' : `${O}14`,
          padding: '3px 11px', borderRadius: 20,
        }}>
          {slots.length}/{total} added
        </span>
      </div>

      <div style={{ padding: '0 18px 18px', background: '#fff' }}>
        {/* Note */}
        <div style={{ background: '#fff9f0', border: '1px solid #ffe0bf', borderRadius: 7,
          padding: '10px 14px', margin: '14px 0', fontSize: 12.5, color: '#555' }}>
          <span style={{ fontWeight: 700, color: '#1a1a2e' }}>Important : </span>
          Enter name as mentioned on your passport or Government approved IDs.
        </div>

        {/* Slots */}
        {slots.length === 0 ? (
          <div style={{ fontSize: 13, color: '#aaa', padding: '4px 0 12px' }}>
            You have not added any {kindNoun} to the list
          </div>
        ) : slots.map((slot, idx) => (
          <div key={slot.id} style={{
            background: '#fafafa', border: '1px solid #f0e8e8',
            borderRadius: 9, padding: 16, marginBottom: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 18, height: 18, borderRadius: 4, background: O, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1a1a2e' }}>{label} {idx + 1}</span>
              </div>
              {(idx >= required || slots.length > required) && (
                <button onClick={() => removeSlot(slot.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer',
                    color: '#bbb', fontSize: 17, lineHeight: 1, padding: '2px 6px' }}>✕</button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 1fr', gap: 12 }}>
              <div>
                <label style={LBL}>Title *</label>
                <select value={slot.title} onChange={e => update(slot.id, 'title', e.target.value)}
                  style={fieldStyle({ ...INP, cursor: 'pointer' }, showErrors && !slot.title)}>
                  <option value="">Select</option>
                  {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={LBL}>First Name *</label>
                <input value={slot.firstName} onChange={e => update(slot.id, 'firstName', e.target.value)}
                  placeholder="First Name" style={fieldStyle(INP, showErrors && !slot.firstName.trim())} />
              </div>
              <div>
                <label style={LBL}>Last Name *</label>
                <input value={slot.lastName} onChange={e => update(slot.id, 'lastName', e.target.value)}
                  placeholder="Last Name" style={fieldStyle(INP, showErrors && !slot.lastName.trim())} />
              </div>
            </div>
            {/* Date of Birth + Nationality — always shown for intl */}
            {isIntl && (
              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={LBL}>Date of Birth *</label>
                  <input type="date" value={slot.dob ?? ''}
                    onChange={e => update(slot.id, 'dob', e.target.value)}
                    style={fieldStyle({ ...INP, colorScheme: 'light' }, showErrors && !slot.dob)} />
                </div>
                <div>
                  <label style={LBL}>Nationality *</label>
                  <select value={slot.nationality ?? ''}
                    onChange={e => update(slot.id, 'nationality', e.target.value)}
                    style={fieldStyle({ ...INP, appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23aaa'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
                      paddingRight: 30 }, showErrors && !slot.nationality)}>
                      <option value="">Select</option>
                      {['India', 'Thailand', 'United Arab Emirates', 'Singapore', 'United Kingdom', 'United States', 'Australia', 'Germany', 'France', 'Japan', 'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'Gabon', 'Gambia', 'Georgia', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Ivory Coast', 'Jamaica', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia','Zimbabwe'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* ── Passport Details ── */}
            {isIntl && (
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a2e', marginBottom: 10 }}>
                  Passport Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                  {/* Passport No */}
                  <div>
                    <label style={LBL}>Passport No. *</label>
                    <input value={slot.passport ?? ''}
                      onChange={e => update(slot.id, 'passport', e.target.value)}
                      placeholder="e.g. A1234567"
                      style={fieldStyle({ ...INP, textTransform: 'uppercase', letterSpacing: '.06em' },
                        showErrors && !slot.passport?.trim())} />
                  </div>
                  {/* Issuing Country */}
                  <div>
                    <label style={LBL}>Issuing Country *</label>
                    <select value={slot.issuingCountry ?? ''}
                      onChange={e => update(slot.id, 'issuingCountry', e.target.value)}
                      style={fieldStyle({ ...INP, appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23aaa'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
                        paddingRight: 30 }, showErrors && !slot.issuingCountry)}>
                      <option value="">Select</option>
                      {['India','Thailand','United Arab Emirates','Singapore','United Kingdom',
                        'United States','Australia','Germany','France','Japan'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  {/* Passport Issue */}
                  <div>
                    <label style={LBL}>Passport Issue *</label>
                    <input type="date" value={slot.passportIssue ?? ''} max={TODAY_ISO}
                      onChange={e => update(slot.id, 'passportIssue', e.target.value)}
                      style={fieldStyle({ ...INP, colorScheme: 'light' },
                        showErrors && (!slot.passportIssue || slot.passportIssue > TODAY_ISO))} />
                  </div>
                  {/* Passport Expiry */}
                  <div>
                    <label style={LBL}>Passport Expiry *</label>
                    <input type="date" value={slot.passportExpiry ?? ''} min={TOMORROW_ISO}
                      onChange={e => update(slot.id, 'passportExpiry', e.target.value)}
                      style={fieldStyle({ ...INP, colorScheme: 'light' },
                        showErrors && (!slot.passportExpiry || slot.passportExpiry <= TODAY_ISO))} />
                  </div>
                </div>
                <div style={{ fontSize: 10.5, color: '#aaa', marginTop: 2 }}>
                  Enter details exactly as printed on your passport. Passport must be valid for at least 6 months beyond travel date.
                </div>
              </div>
            )}

            {/* ── Frequent Flyer Details ── */}
            {isIntl && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a2e', marginBottom: 2 }}>
                  Frequent Flyer Details
                </div>
                <div style={{ fontSize: 11, color: '#aaa', marginBottom: 10 }}>
                  Please verify the credit of your frequent flyer miles at the airport checkin counter.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={LBL}>Airline</label>
                    <select value={slot.ffAirline ?? ''}
                      onChange={e => update(slot.id, 'ffAirline', e.target.value)}
                      style={{ ...INP, appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23aaa'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
                        paddingRight: 30 }}>
                      <option value="">Select</option>
                      {['IndiGo','Air India','Thai Airways','Air Asia','Emirates',
                        'Singapore Airlines','Qatar Airways'].map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={LBL}>Frequent Flyer No.</label>
                    <input value={slot.ffNumber ?? ''}
                      onChange={e => update(slot.id, 'ffNumber', e.target.value)}
                      placeholder="Frequent Flyer No." style={INP} />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {slots.length < required && (
          <button onClick={addSlot} style={{
            padding: '9px 20px', background: `linear-gradient(135deg,${O},${O2})`,
            color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '.02em',
          }}>
            + ADD NEW {label}
          </button>
        )}
      </div>
    </div>
  );
}

/* Build a real flight segment from the query params the results page sends on Book Now.
 * Returns null when the expected params aren't present (e.g. page opened directly without a
 * real search), so callers can fall back to demo data. */
function buildSegmentFromParams(
  sp: { get(key: string): string | null },
  prefix: string,
  label: 'outward' | 'return',
): FlightSeg | null {
  const from = sp.get(`${prefix}_from`);
  const to = sp.get(`${prefix}_to`);
  if (!from || !to) return null;
  const stripCity = (s: string) => s.replace(/\s*\(.*?\)$/, '').split(',')[0].trim();
  const extractCode = (s: string) => (s.match(/\(([^)]+)\)\s*$/)?.[1] ?? s).trim();
  return {
    label,
    from: stripCity(from),
    to: stripCity(to),
    fromCode: extractCode(from),
    toCode: extractCode(to),
    date: sp.get(`${prefix}_date`) ?? '',
    stops: sp.get(`${prefix}_stops`) ?? '',
    dur: sp.get(`${prefix}_dur`) ?? '',
    airlineCode: sp.get(`${prefix}_airCode`) ?? '',
    flightCode: sp.get(`${prefix}_flightCode`) ?? '',
    aircraft: '',
    dep: sp.get(`${prefix}_dep`) ?? '',
    arr: sp.get(`${prefix}_arr`) ?? '',
    depTerminal: from,
    arrTerminal: to,
    price: Number(sp.get(`${prefix}_price`)) || undefined,
  };
}

/* Reads back the yatraId/price the results page stamped onto each selected leg (out/ret or
 * leg0..legN), for use with useFlightPriceCheck — a live re-check against /api/flights/search. */
function buildPriceCheckLegs(
  sp: { get(key: string): string | null },
  isMulti: boolean,
  isRound: boolean,
  segCount: number,
): PriceCheckLeg[] {
  const oneLeg = (key: string, label: string): PriceCheckLeg | null => {
    const yatraId = sp.get(`${key}_yatraId`);
    const price = Number(sp.get(`${key}_price`));
    if (!yatraId || !price) return null;
    return { key, label, yatraId, price };
  };
  if (isMulti) {
    return Array.from({ length: segCount }, (_, i) => oneLeg(`leg${i}`, `Segment ${i + 1}`))
      .filter((l): l is PriceCheckLeg => l !== null);
  }
  const legs = [oneLeg('out', 'Outward Flight')];
  if (isRound) legs.push(oneLeg('ret', 'Return Flight'));
  return legs.filter((l): l is PriceCheckLeg => l !== null);
}

/* Encode one traveller-type's slots into `${prefix}N_*` params so the next page can rebuild
 * the full traveller list (name +, for international bookings, passport/DOB/frequent-flyer). */
function appendSlotParams(qs: URLSearchParams, prefix: string, slots: SlotForm[], isIntl: boolean) {
  slots.forEach((s, i) => {
    const p = `${prefix}${i + 1}`;
    qs.set(`${p}_title`, s.title);
    qs.set(`${p}_first`, s.firstName);
    qs.set(`${p}_last`, s.lastName);
    if (isIntl) {
      qs.set(`${p}_dob`, s.dob ?? '');
      qs.set(`${p}_passport`, s.passport ?? '');
      qs.set(`${p}_nationality`, s.nationality ?? '');
      qs.set(`${p}_issuingCountry`, s.issuingCountry ?? '');
      qs.set(`${p}_passportIssue`, s.passportIssue ?? '');
      qs.set(`${p}_passportExpiry`, s.passportExpiry ?? '');
      qs.set(`${p}_ffAirline`, s.ffAirline ?? '');
      qs.set(`${p}_ffNumber`, s.ffNumber ?? '');
    }
  });
}

/* ─── Fare Summary card (collapsible pax-wise / base-fare / additional-charges breakdown) ─── */
function FareSummaryCard({ title, accent, kinds, counts, rows, grandTotal, serviceFee = 0, gstPercentage = 0, defaultOpen = true }: {
  title: string; accent: string;
  kinds: readonly ('Adult' | 'Child' | 'Infant')[];
  counts: number[];
  rows: ({ base: number; tax: number; total: number } | null)[];
  grandTotal: number;
  serviceFee?: number;
  /** From service_fee.is_gst / module_setting.gst_percentage — 0 when GST doesn't apply to this fee. */
  gstPercentage?: number;
  defaultOpen?: boolean;
}) {
  const [showDetails, setShowDetails] = useState(defaultOpen);
  const [openPax,  setOpenPax]  = useState(true);
  const [openBase, setOpenBase] = useState(true);
  const [openAdd,  setOpenAdd]  = useState(true);

  const baseFareTotal = rows.reduce((s, r) => s + (r?.total ?? 0), 0);
  const gstOnServiceFee = Math.round((serviceFee * gstPercentage) / 100);
  const amountWithFee = grandTotal + serviceFee + gstOnServiceFee;
  const accentDk = accent === PK ? '#a8123d' : O2;

  const SectionHeader = ({ label, open, onClick }: { label: string; open: boolean; onClick: () => void }) => (
    <div onClick={onClick} style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      background: '#faf6f2', padding: '4px 16px', cursor: 'pointer', userSelect: 'none',
      borderTop: '1px solid #f0e8e2', borderBottom: '1px solid #f0e8e2',
    }}>
      <span style={{ fontSize: 10, fontWeight: 800, color: '#8a8378', lineHeight: 1.15,
        letterSpacing: '.08em', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: 8, color: accent, transition: 'transform .15s', lineHeight: 1,
        display: 'inline-block', transform: open ? 'rotate(0deg)' : 'rotate(180deg)' }}>▲</span>
    </div>
  );

  const Row = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: bold ? '5px 16px' : '3px 16px', background: '#fff',
      borderTop: bold ? '1px dashed #eee2d8' : 'none' }}>
      <span style={{ fontSize: bold ? 12 : 11.5, color: bold ? '#1a1a2e' : '#8a8378', lineHeight: 1.15,
        fontWeight: bold ? 800 : 500, letterSpacing: '.01em' }}>{label}</span>
      <span style={{ fontSize: bold ? 12.5 : 11.5, color: bold ? accent : '#3a3530', lineHeight: 1.15,
        fontWeight: bold ? 800 : 600, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 10,
      border: '1px solid #f0e8e2', boxShadow: '0 4px 18px rgba(0,0,0,.05)' }}>

      {/* Header band */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: `linear-gradient(135deg,${accent} 0%,${accentDk} 100%)`, padding: '7px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span onClick={() => setShowDetails(p => !p)} style={{
            width: 17, height: 17, borderRadius: '50%', background: 'rgba(255,255,255,.22)',
            border: '1.5px solid rgba(255,255,255,.7)', flexShrink: 0,
            color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center',
            justifyContent: 'center', lineHeight: 1, cursor: 'pointer' }}>{showDetails ? '−' : '+'}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '.005em', lineHeight: 1.15 }}>{title}</span>
        </div>
        <span style={{ fontSize: 10.5, color: '#fff', fontWeight: 700, letterSpacing: '.02em', lineHeight: 1.15,
          textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer', opacity: .92 }}>
          Fare Rule
        </span>
      </div>

      {/* Show details toggle */}
      <div style={{ padding: '4px 16px', background: '#fff', borderBottom: '1px solid #f5efe9' }}>
        <span onClick={() => setShowDetails(p => !p)} style={{
          fontSize: 10.5, color: accent, fontWeight: 700, letterSpacing: '.02em', lineHeight: 1.15,
          textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer', display: 'inline-block' }}>
          {showDetails ? '− Hide Details' : '+ Show Details'}
        </span>
      </div>

      {showDetails && (
        <>
          {/* Pax-wise Fare — per individual passenger, not multiplied by count */}
          <SectionHeader label="Pax-wise Fare" open={openPax} onClick={() => setOpenPax(p => !p)} />
          {openPax && kinds.map((kind, i) => {
            const row = rows[i];
            const count = counts[i];
            if (!count || !row) return null;
            const unitBase  = row.base  / count;
            const unitTax   = row.tax   / count;
            const unitTotal = row.total / count;
            return (
              <div key={kind}>
                <Row label={kind} value={`₹ ${unitBase.toLocaleString()}.00`} />
                <Row label="Tax" value={`₹ ${unitTax.toLocaleString()}.00`} />
                <Row label="T. Fee and S.Charges" value="₹ 0.00" />
                <Row label="Total" value={`₹ ${unitTotal.toLocaleString()}.00`} bold />
              </div>
            );
          })}

          {/* Base Fare — per-pax cost × number of persons */}
          <SectionHeader label="Base Fare" open={openBase} onClick={() => setOpenBase(p => !p)} />
          {openBase && (
            <>
              {kinds.map((kind, i) => {
                const row = rows[i];
                const count = counts[i];
                if (!count || !row) return null;
                const unitTotal = row.total / count;
                return (
                  <Row key={kind}
                    label={`${kind}  (₹ ${unitTotal.toLocaleString()} × ${count})`}
                    value={`₹ ${row.total.toLocaleString()}.00`} />
                );
              })}
              <Row label="Total Base Fare" value={`₹ ${baseFareTotal.toLocaleString()}.00`} bold />
            </>
          )}

          {/* Additional Charges */}
          <SectionHeader label="Additional Charges" open={openAdd} onClick={() => setOpenAdd(p => !p)} />
          {openAdd && (
            <>
              <Row label="Excess Baggage (0KG)" value="₹ 0.00" />
              <Row label="Meal (0 Platter)" value="₹ 0.00" />
              <Row label="Special Service" value="₹ 0.00" />
              {serviceFee > 0 && <Row label="Service Fee" value={`₹ ${serviceFee.toLocaleString()}.00`} />}
              {gstOnServiceFee > 0 && <Row label={`GST on Service Fee (${gstPercentage}%)`} value={`₹ ${gstOnServiceFee.toLocaleString()}.00`} />}
            </>
          )}
        </>
      )}

      {/* Amount */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '6px 16px', borderTop: `2px solid ${accent}30`,
        background: `linear-gradient(135deg,${accent}12,${accent}05)` }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: accent, lineHeight: 1.15,
          letterSpacing: '.08em', textTransform: 'uppercase' }}>Amount</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: accent, letterSpacing: '-.01em', lineHeight: 1.15,
          fontVariantNumeric: 'tabular-nums' }}>₹ {amountWithFee.toLocaleString()}.00</span>
      </div>
    </div>
  );
}

/* ─── Page ─── */
function PassengerDetailsContent() {
  const searchParams = useSearchParams();
  const isRound = searchParams.get('trip') === 'round';
  const isMulti = searchParams.get('trip') === 'multi';
  const isIntl  = searchParams.get('type') === 'international';

  let realSegments: FlightSeg[] = [];
  if (isMulti) {
    const noSeg = Number(searchParams.get('no_segments')) || 0;
    for (let i = 0; i < noSeg; i++) {
      const seg = buildSegmentFromParams(searchParams, `leg${i}`, 'outward');
      if (seg) realSegments.push(seg);
    }
  } else {
    const realOutSeg = buildSegmentFromParams(searchParams, 'out', 'outward');
    const realRetSeg = isRound ? buildSegmentFromParams(searchParams, 'ret', 'return') : null;
    realSegments = [realOutSeg, realRetSeg].filter((s): s is FlightSeg => s !== null);
  }
  const activeSegments = realSegments.length > 0 ? realSegments : (isIntl ? INTL_SEGMENTS : SEGMENTS);
  const activePaxRate  = isIntl ? INTL_PAX_RATE : PAX_RATE;

  // Traveller counts must match what was actually searched/booked for — you can't add more
  // passengers here than the flight was searched with, since the fare was priced for that count.
  const parseCount = (raw: string | null, fallback: number) => {
    const n = parseInt(raw ?? '', 10);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  const requiredAdults   = Math.max(1, parseCount(searchParams.get('adults'), 1));
  const requiredChildren = parseCount(searchParams.get('childs'), 0);
  const requiredInfants  = parseCount(searchParams.get('infants'), 0);
  const makeSlots = (n: number): SlotForm[] =>
    Array.from({ length: n }, (_, i) => ({ id: i + 1, title: '', firstName: '', lastName: '' }));

  const [adultSlots,  setAdultSlots]  = useState<SlotForm[]>(() => makeSlots(requiredAdults));
  const [childSlots,  setChildSlots]  = useState<SlotForm[]>(() => makeSlots(requiredChildren));
  const [infantSlots, setInfantSlots] = useState<SlotForm[]>(() => makeSlots(requiredInfants));
  const [countryCode, setCountryCode] = useState('+91');
  const [mobile,      setMobile]      = useState('');
  const [email,       setEmail]       = useState('');
  const [showErrors,  setShowErrors]  = useState(false);

  // Prefill "Booking Details Will Be Sent To" with the logged-in user's own contact info, so
  // they don't have to retype it — still fully editable afterward.
  const { user } = useCurrentUser();
  useEffect(() => {
    if (!user) return;
    setEmail(prev => prev || user.email || '');
    setMobile(prev => prev || user.mobile || '');
  }, [user]);

  // Every mandatory field (marked *) must be filled — DOB/Nationality/Passport details only
  // apply to international bookings — and the slot count for each traveller type must exactly
  // match what was searched for, since the fare was priced for that count.
  function isSlotValid(s: SlotForm): boolean {
    if (!s.title || !s.firstName.trim() || !s.lastName.trim()) return false;
    if (isIntl && (!s.dob || !s.nationality?.trim() || !s.passport?.trim()
      || !s.issuingCountry || !s.passportIssue || !s.passportExpiry)) return false;
    if (isIntl && s.passportIssue && s.passportIssue > TODAY_ISO) return false;
    if (isIntl && s.passportExpiry && s.passportExpiry <= TODAY_ISO) return false;
    return true;
  }
  const countsMatch    = adultSlots.length === requiredAdults
    && childSlots.length === requiredChildren && infantSlots.length === requiredInfants;
  const allSlots        = [...adultSlots, ...childSlots, ...infantSlots];
  const fieldsComplete  = allSlots.every(isSlotValid);
  const hasFutureIssue  = isIntl && allSlots.some(s => !!s.passportIssue && s.passportIssue > TODAY_ISO);
  const hasPastExpiry   = isIntl && allSlots.some(s => !!s.passportExpiry && s.passportExpiry <= TODAY_ISO);
  const travellersValid = countsMatch && fieldsComplete;

  // Mobile/email are how the booking confirmation (and its invoice) actually reach the
  // traveller, so they're mandatory just like the traveller fields above.
  const mobileValid  = /^\d{7,15}$/.test(mobile.trim());
  const emailValid   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const contactValid = mobileValid && emailValid;
  const [hasGST,         setHasGST]         = useState(false);
  const [gstSaved,       setGstSaved]       = useState('');
  const [gstDetailSaved, setGstDetailSaved] = useState(false);
  const [gstCompanyName, setGstCompanyName] = useState('');
  const [gstRegNo,       setGstRegNo]       = useState('');
  const [gstNo,          setGstNo]          = useState('');
  const [gstPin,         setGstPin]         = useState('');
  const [gstState,       setGstState]       = useState('');
  const [gstAddress,     setGstAddress]     = useState('');

  // Saved company GSTs — fetched from corporate_gsts (the same data managed on
  // /corporate/gst-details) the first time the traveller opens this section, so "Select Company
  // Name" reflects their real saved list instead of a hardcoded demo entry.
  const [savedGsts, setSavedGsts] = useState<{
    id: number; companyName: string | null; registrationNo: string | null; gstNumber: string | null;
    pincode: string | null; stateId: number | null; address: string | null;
  }[]>([]);
  const [gstStates, setGstStates] = useState<{ id: number; name: string }[]>([]);
  const [savedGstsLoaded, setSavedGstsLoaded] = useState(false);

  useEffect(() => {
    if (!hasGST || savedGstsLoaded) return;
    setSavedGstsLoaded(true);
    fetch('/api/gst-details')
      .then(res => res.json())
      .then(data => {
        setSavedGsts(data.gsts ?? []);
        setGstStates(data.states ?? []);
      })
      .catch(() => {});
  }, [hasGST, savedGstsLoaded]);

  const [savingGst,   setSavingGst]   = useState(false);
  const [gstSaveError, setGstSaveError] = useState('');
  const [gstShowErrors, setGstShowErrors] = useState(false);

  // "Save GST Details" only needs to actually write anything when the traveller typed the details
  // in by hand — picking an already-saved company from the dropdown (handleSelectSavedGst) marks
  // gstDetailSaved true immediately since that record already exists in corporate_gsts.
  const gstFieldsComplete = !!(gstCompanyName.trim() && gstRegNo.trim() && gstNo.trim()
    && gstPin.trim() && gstState && gstAddress.trim());

  // Once "I have a GST number" is checked, a saved company must be selected in the dropdown
  // (gstSaved) — picking one directly satisfies this, and hand-typing the details only sets it
  // once "Save GST Details" succeeds (handleSaveGstDetails selects the newly-saved record).
  const formValid = travellersValid && contactValid && (!hasGST || (gstFieldsComplete && gstDetailSaved && !!gstSaved));

  async function handleSaveGstDetails() {
    setGstSaveError('');
    if (!gstFieldsComplete) {
      setGstShowErrors(true);
      setGstSaveError('Please fill all GST fields.');
      return;
    }
    setSavingGst(true);
    try {
      const res = await fetch('/api/gst-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: gstCompanyName, registrationNo: gstRegNo, gstNumber: gstNo,
          pincode: gstPin, stateId: gstState || null, address: gstAddress,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGstSaveError(data.error ?? 'Failed to save GST details.');
        return;
      }
      const newId = data.id as number;
      setSavedGsts(prev => [
        {
          id: newId, companyName: gstCompanyName, registrationNo: gstRegNo, gstNumber: gstNo,
          pincode: gstPin, stateId: gstState ? Number(gstState) : null, address: gstAddress,
        },
        ...prev,
      ]);
      setGstSaved(String(newId));
      setGstDetailSaved(true);
    } catch {
      setGstSaveError('Something went wrong. Please try again.');
    } finally {
      setSavingGst(false);
    }
  }

  // Selecting a saved company fills every field below from that record.
  function handleSelectSavedGst(id: string) {
    setGstSaved(id);
    const rec = savedGsts.find(g => String(g.id) === id);
    if (!rec) return;
    setGstCompanyName(rec.companyName ?? '');
    setGstRegNo(rec.registrationNo ?? '');
    setGstNo(rec.gstNumber ?? '');
    setGstPin(rec.pincode ?? '');
    setGstState(rec.stateId ? String(rec.stateId) : '');
    setGstAddress(rec.address ?? '');
    setGstDetailSaved(true);
  }

  /* ── Dynamic billing ── */
  const aC = adultSlots.length;
  const cC = childSlots.length;
  const iC = infantSlots.length;

  // Every leg the traveller is shown below — one for one-way, all of them for round-trip/multi.
  const displaySegs = (!isRound && !isMulti) ? [activeSegments[0]] : activeSegments;

  function fixedFare(kind: 'child' | 'infant', count: number) {
    if (count === 0) return null;
    const { base, tax } = activePaxRate[kind];
    return { base: base * count, tax: tax * count, total: (base + tax) * count };
  }
  // The adult fare uses the REAL per-adult price carried over from the results page for that
  // specific leg when available, so the total here matches what was shown there — only falling
  // back to the flat estimate table when opened without a real search (demo data).
  function adultFare(seg: FlightSeg | undefined, count: number) {
    if (count === 0) return null;
    if (seg?.price) return { base: seg.price * count, tax: 0, total: seg.price * count };
    const { base, tax } = activePaxRate.adult;
    return { base: base * count, tax: tax * count, total: (base + tax) * count };
  }

  const legCount = Math.max(1, displaySegs.length);
  const legFares = displaySegs.map(s => {
    const adult  = adultFare(s, aC);
    const child  = fixedFare('child', cC);
    const infant = fixedFare('infant', iC);
    return { adult, child, infant, total: (adult?.total ?? 0) + (child?.total ?? 0) + (infant?.total ?? 0) };
  });
  const totalFlightAmt = legFares.reduce((sum, lf) => sum + lf.total, 0);

  // Service fee is fetched from the service_fee table (product/supplier/sales-channel fixed to
  // this corporate flight flow) — fixed amount or a percentage of the flight fare, keyed by
  // sector (one-way/round-trip) and booking_type (domestic/international). No row exists for
  // multi-city, so it falls back to the one-way rate the same way the DB has no 'M' sector.
  const svcSector = isRound ? 'R' : 'O';
  const svcBookingType = isIntl ? 'international' : 'domestic';
  const [serviceFee, setServiceFee] = useState(0);
  const [gstPercentage, setGstPercentage] = useState(0);
  useEffect(() => {
    if (!totalFlightAmt) { setServiceFee(0); setGstPercentage(0); return; }
    let cancelled = false;
    fetch(`/api/service-fee?sector=${svcSector}&bookingType=${svcBookingType}&amount=${totalFlightAmt}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        setServiceFee(Number(data.serviceFee) || 0);
        setGstPercentage(data.isGst ? Number(data.gstPercentage) || 0 : 0);
      })
      .catch(() => { if (!cancelled) { setServiceFee(0); setGstPercentage(0); } });
    return () => { cancelled = true; };
  }, [svcSector, svcBookingType, totalFlightAmt]);

  // The flat service fee is split evenly across legs (remainder on the first), which for
  // legCount=2 reproduces the original round-trip 50/50 split exactly (out gets the extra
  // rupee on odd totals).
  const legServiceFees = Array.from({ length: legCount }, (_, i) => {
    const base = Math.floor(serviceFee / legCount);
    return i === 0 ? serviceFee - base * (legCount - 1) : base;
  });
  const gstFor = (fee: number) => Math.round((fee * gstPercentage) / 100);
  const grandTotalAmt = legFares.reduce((sum, lf, i) => sum + lf.total + (legServiceFees[i] ?? 0) + gstFor(legServiceFees[i] ?? 0), 0);

  const paxDesc = [
    aC > 0 ? `${aC} Adult${aC > 1 ? 's' : ''}` : '',
    cC > 0 ? `${cC} Child${cC > 1 ? 'ren' : ''}` : '',
    iC > 0 ? `${iC} Infant${iC > 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ') || '1 Adult';

  const priceCheckLegs = buildPriceCheckLegs(searchParams, isMulti, isRound, realSegments.length);
  const { changes: priceChanges, dismiss: dismissPriceChanges } =
    useFlightPriceCheck(searchParams.get('origSearch'), priceCheckLegs);

  return (
    <div className={inter.className} style={{ background: '#fdf6f2', minHeight: '100vh', color: '#1a1a2e' }}>
      <PriceChangeNotice changes={priceChanges} onDismiss={dismissPriceChanges} />

      {/* ── NAV ── */}
      <CorpHeader />

      {/* ── STEPPER ── */}
      <div style={{ padding: '20px 0 0' }}>
        <BookingProgress step={3} />
      </div>

      {/* ── HERO ── */}
      <div style={{
        background: 'linear-gradient(135deg,#f07820 0%,#c8622a 55%,#7a3010 100%)',
        padding: '32px 5%', textAlign: 'center', marginTop: 20,
      }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>
          Complete Your Booking
        </h1>
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,.8)', margin: '0 0 18px' }}>
          Review itinerary, add traveller details, and confirm your trip securely.
        </p>
        <div style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {['1. Review Flight', '2. Add Travellers', '3. Confirm & Continue'].map((s, i) => (
            <div key={i} style={{
              padding: '6px 18px', background: 'rgba(255,255,255,.18)', borderRadius: 20,
              fontSize: 12.5, fontWeight: 600, color: '#fff', border: '1px solid rgba(255,255,255,.3)',
            }}>{s}</div>
          ))}
        </div>
      </div>

      {/* ── TWO-COLUMN MAIN ── */}
      <div style={{
        display: 'flex', gap: 22, padding: '28px 5%', maxWidth: 1280,
        margin: '0 auto', width: '100%', boxSizing: 'border-box', alignItems: 'flex-start',
      }}>

        {/* ── LEFT ── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Flight Itinerary */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e', margin: 0 }}>
                Flight Itinerary
              </h2>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                background: `${O}12`, border: `1px solid ${O}44`,
                borderRadius: 20, padding: '4px 14px' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: O }}>
                  {isRound ? 'ROUND TRIP' : isMulti ? 'MULTI CITY' : 'ONE WAY'}{isIntl ? ' · INTERNATIONAL' : ''} · {paxDesc}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {displaySegs.map((seg, i) => (
                <FlightCard key={i} seg={seg} index={i} isMulti={isMulti} />
              ))}
            </div>
          </div>

          {/* Traveller Details */}
          <div id="traveller-details" style={{ background: '#fff', borderRadius: 12, padding: '22px 24px',
            border: '1px solid #f0e8e8', boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e', margin: '0 0 18px' }}>
              Traveller Details
            </h2>
            {showErrors && !travellersValid && (
              <div style={{ background: '#fdeef1', border: '1px solid #f3c6d0', borderRadius: 8,
                padding: '10px 14px', marginBottom: 16, fontSize: 12.5, color: PK, fontWeight: 600 }}>
                {!countsMatch
                  ? `Please add exactly ${requiredAdults} adult(s)${requiredChildren ? `, ${requiredChildren} child(ren)` : ''}${requiredInfants ? `, ${requiredInfants} infant(s)` : ''} as selected in your search.`
                  : hasFutureIssue
                  ? 'Passport Issue date cannot be in the future — it must be today or an earlier date.'
                  : hasPastExpiry
                  ? 'Passport Expiry date must be a future date.'
                  : 'Please fill all mandatory fields (marked *) for every traveller before continuing.'}
              </div>
            )}
            <TravellerSection label="ADULT"  ageRange="12 yrs+"         kind="adult"  required={requiredAdults}
              slots={adultSlots}  setSlots={setAdultSlots}  isIntl={isIntl} showErrors={showErrors} />
            <TravellerSection label="CHILD"  ageRange="2-12 Yrs"        kind="child"  required={requiredChildren}
              slots={childSlots}  setSlots={setChildSlots}  isIntl={isIntl} showErrors={showErrors} />
            <TravellerSection label="Infant" ageRange="15 days - 2 Yrs" kind="infant" required={requiredInfants}
              slots={infantSlots} setSlots={setInfantSlots} isIntl={isIntl} showErrors={showErrors} />
          </div>

          {/* Booking Contact */}
          <div id="booking-contact" style={{ background: '#fff', borderRadius: 12, padding: '22px 24px',
            border: '1px solid #f0e8e8', boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e', margin: '0 0 18px' }}>
              Booking Details Will Be Sent To
            </h2>
            {showErrors && !contactValid && (
              <div style={{ background: '#fdeef1', border: '1px solid #f3c6d0', borderRadius: 8,
                padding: '10px 14px', marginBottom: 16, fontSize: 12.5, color: PK, fontWeight: 600 }}>
                Please enter a valid mobile number and email address — your booking confirmation and invoice are sent there.
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <label style={LBL}>Country Code</label>
                <select value={countryCode} onChange={e => setCountryCode(e.target.value)}
                  style={{ ...INP, cursor: 'pointer' }}>
                  <option value="+91">INDIA +91</option>
                  <option value="+1">USA +1</option>
                  <option value="+44">UK +44</option>
                  <option value="+971">UAE +971</option>
                  <option value="+65">SGP +65</option>
                </select>
              </div>
              <div>
                <label style={LBL}>Mobile Number *</label>
                <input type="tel" placeholder="Enter Mobile Number" value={mobile}
                  onChange={e => setMobile(e.target.value)}
                  style={fieldStyle(INP, showErrors && !mobileValid)} />
              </div>
              <div>
                <label style={LBL}>Email Address *</label>
                <input type="email" placeholder="Enter Email Address" value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={fieldStyle(INP, showErrors && !emailValid)} />
              </div>
            </div>

            {/* ── GST Section ── */}
            <div id="gst-section" style={{ marginBottom: 22 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer',
                fontSize: 13, color: '#555', userSelect: 'none', marginBottom: hasGST ? 16 : 0 }}>
                <input type="checkbox" checked={hasGST} onChange={e => setHasGST(e.target.checked)}
                  style={{ width: 15, height: 15, accentColor: O, cursor: 'pointer' }} />
                I have a <span style={{ color: O, fontWeight: 600 }}>GST</span> number (Optional)
              </label>

              {hasGST && (() => {
                const gi: React.CSSProperties = {
                  width: '100%', padding: '10px 14px',
                  border: `1.5px solid ${O}`,
                  borderRadius: 8, fontSize: 13, color: '#1a1a2e', outline: 'none',
                  background: '#fff', fontFamily: 'inherit', boxSizing: 'border-box',
                };
                const gl: React.CSSProperties = {
                  fontSize: 12.5, fontWeight: 700, color: '#1a1a2e',
                  display: 'block', marginBottom: 6,
                };
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Saved company dropdown */}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 6 }}>
                        Select Company Name *{' '}
                        <span style={{ fontSize: 11, fontWeight: 400, color: '#aaa' }}>(From your saved GSTs)</span>
                      </div>
                      <select value={gstSaved} onChange={e => handleSelectSavedGst(e.target.value)}
                        style={fieldStyle({ ...gi, cursor: 'pointer' }, gstShowErrors && !gstSaved)}>
                        <option value="">
                          {savedGsts.length === 0 ? '-- No saved GSTs --' : '-- Select Saved Company --'}
                        </option>
                        {savedGsts.map(g => (
                          <option key={g.id} value={g.id}>
                            {g.companyName || 'Unnamed'}{g.gstNumber ? ` (${g.gstNumber})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Row 1: Company Name · Reg No · GST */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                      <div>
                        <label style={gl}>Company Name *</label>
                        <input placeholder="Enter Company Name" value={gstCompanyName}
                          onChange={e => { setGstCompanyName(sanitizeCompanyName(e.target.value)); setGstDetailSaved(false); setGstSaved(''); }}
                          style={fieldStyle(gi, gstShowErrors && !gstCompanyName.trim())} />
                      </div>
                      <div>
                        <label style={gl}>Registration No *</label>
                        <input placeholder="Enter Registration No" value={gstRegNo}
                          onChange={e => { setGstRegNo(sanitizeAlphanumeric(e.target.value)); setGstDetailSaved(false); setGstSaved(''); }}
                          style={fieldStyle(gi, gstShowErrors && !gstRegNo.trim())} />
                      </div>
                      <div>
                        <label style={gl}>GST *</label>
                        <input placeholder="Enter GST No" value={gstNo} maxLength={15}
                          onChange={e => { setGstNo(sanitizeAlphanumeric(e.target.value)); setGstDetailSaved(false); setGstSaved(''); }}
                          style={fieldStyle(gi, gstShowErrors && !gstNo.trim())} />
                      </div>
                    </div>

                    {/* Row 2: Pin Code · State · Address */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                      <div>
                        <label style={gl}>Pin Code *</label>
                        <input placeholder="Enter Pin Code" value={gstPin} maxLength={6}
                          onChange={e => { setGstPin(sanitizeDigits(e.target.value)); setGstDetailSaved(false); setGstSaved(''); }}
                          style={fieldStyle(gi, gstShowErrors && !gstPin.trim())} />
                      </div>
                      <div>
                        <label style={gl}>State *</label>
                        <select value={gstState} onChange={e => { setGstState(e.target.value); setGstDetailSaved(false); setGstSaved(''); }}
                          style={fieldStyle({ ...gi, cursor: 'pointer' }, gstShowErrors && !gstState)}>
                          <option value="">Select State</option>
                          {gstStates.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={gl}>Address *</label>
                        <input placeholder="Enter Address" value={gstAddress}
                          onChange={e => { setGstAddress(sanitizeAddress(e.target.value)); setGstDetailSaved(false); setGstSaved(''); }}
                          style={fieldStyle(gi, gstShowErrors && !gstAddress.trim())} />
                      </div>
                    </div>

                    {/* Save GST button */}
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px dashed ${O}44` }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 11.5, color: '#aaa' }}>
                          Save this GST for faster checkout next time
                        </div>
                        {gstDetailSaved ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7,
                            background: '#eafaf2', border: '1px solid #a3d9b8',
                            borderRadius: 8, padding: '7px 16px' }}>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <circle cx="7" cy="7" r="7" fill="#2d8a4e"/>
                              <path d="M4 7L6 9L10 5" stroke="#fff" strokeWidth="1.8"
                                strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#2d8a4e' }}>
                              GST Saved!
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={handleSaveGstDetails}
                            disabled={savingGst}
                            style={{
                              padding: '8px 20px', background: 'none',
                              border: `1.5px solid ${O}`, borderRadius: 8,
                              fontSize: 12.5, fontWeight: 700, color: O,
                              cursor: savingGst ? 'default' : 'pointer', fontFamily: 'inherit',
                              opacity: savingGst ? 0.55 : 1,
                            }}>
                            {savingGst ? 'Saving…' : 'Save GST Details'}
                          </button>
                        )}
                      </div>
                      {gstSaveError && (
                        <div style={{ fontSize: 11.5, color: '#c9184a', marginTop: 8 }}>{gstSaveError}</div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
              <button onClick={() => {
                if (!formValid) {
                  setShowErrors(true);
                  if (hasGST && !gstFieldsComplete) {
                    setGstShowErrors(true);
                  } else if (hasGST && gstFieldsComplete && !gstDetailSaved) {
                    setGstSaveError('Please click "Save GST Details" before continuing.');
                  }
                  const target = !travellersValid ? 'traveller-details'
                    : !contactValid ? 'booking-contact'
                    : 'gst-section';
                  document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  return;
                }
                // Carry forward everything already in the URL (trip type, flight legs),
                // plus the traveller names and contact details just entered. Re-set the pax
                // counts explicitly from the actual slots being submitted — the incoming URL
                // may not have had them (e.g. arriving from a link that only passed trip/type),
                // and review-booking relies on `adults`/`childs`/`infants` to know how many
                // real passengers to read, otherwise it silently falls back to demo data.
                const qs = new URLSearchParams(searchParams.toString());
                appendSlotParams(qs, 'adult', adultSlots, isIntl);
                appendSlotParams(qs, 'child', childSlots, isIntl);
                appendSlotParams(qs, 'infant', infantSlots, isIntl);
                qs.set('adults', String(adultSlots.length));
                qs.set('childs', String(childSlots.length));
                qs.set('infants', String(infantSlots.length));
                qs.set('countryCode', countryCode);
                qs.set('mobile', mobile);
                qs.set('email', email);
                if (hasGST) {
                  qs.set('gstCompanyName', gstCompanyName);
                  qs.set('gstRegNo', gstRegNo);
                  qs.set('gstNo', gstNo);
                  qs.set('gstPin', gstPin);
                  qs.set('gstStateName', gstStates.find(s => String(s.id) === gstState)?.name ?? '');
                  qs.set('gstAddress', gstAddress);
                }
                window.location.href = `/corporate/review-booking?${qs.toString()}`;
              }} style={{
                padding: '12px 40px', background: `linear-gradient(135deg,${O},${O2})`,
                color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '.02em',
                boxShadow: `0 4px 16px ${O}44`,
              }}>Continue</button>
            </div>

            <div style={{ fontSize: 12.5, color: '#888', fontFamily: 'inherit' }}>
              By clicking continue you agree to <span style={{ textDecoration: 'underline' }}>terms and conditions</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT — Billing ── */}
        <div style={{ width: 286, flexShrink: 0, position: 'sticky', top: 82 }}>
          <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden',
            border: '1px solid #f0e8e8', boxShadow: '0 8px 32px rgba(240,120,32,.12)' }}>

            {/* Orange header */}
            <div style={{ background: `linear-gradient(135deg,${O} 0%,${O2} 100%)`, padding: '20px 22px' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,.75)',
                letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 10 }}>Price Summary</div>
              {/* Routes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
                {displaySegs.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,.6)', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>{s.from} ({s.fromCode}) → {s.to} ({s.toCode})</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,.6)' }}>{s.date}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center',
                background: 'rgba(255,255,255,.2)', borderRadius: 5, padding: '3px 12px' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>
                  {isRound ? 'ROUND TRIP' : isMulti ? 'MULTI CITY' : 'ONE WAY'}{isIntl ? ' · INTERNATIONAL' : ''} · {paxDesc}
                </span>
              </div>
            </div>

            {/* Fare type + travellers */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 22px 0' }}>
              <div>
                <div style={{ fontSize: 9, color: '#bbb', textTransform: 'uppercase',
                  letterSpacing: '.1em', marginBottom: 5 }}>Fare Type</div>
                <div style={{ display: 'inline-flex', alignItems: 'center',
                  background: `${O}14`, border: `1px solid ${O}44`,
                  borderRadius: 6, padding: '3px 10px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: O }}>SAVER</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9, color: '#bbb', textTransform: 'uppercase',
                  letterSpacing: '.1em', marginBottom: 5 }}>Travellers</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>{paxDesc}</div>
              </div>
            </div>

            <div style={{ height: 1, background: '#f0e8e8', margin: '14px 22px' }} />

            {/* Fare summary cards — collapsible pax-wise / base-fare / additional-charges.
             * One card per leg: round trip gets the familiar Outbound/Inbound pair, multi-city
             * gets one per sector, one-way gets a single card. */}
            <div style={{ padding: '0 22px 6px' }}>
              {displaySegs.map((s, i) => (
                <FareSummaryCard
                  key={i}
                  title={isRound ? (i === 0 ? 'Outbound Fare Summary' : 'Inbound Fare Summary')
                    : isMulti ? `${s.from} (${s.fromCode}) → ${s.to} (${s.toCode}) Fare Summary` : 'Fare Summary'}
                  accent={i % 2 === 0 ? O : PK}
                  kinds={['Adult', 'Child', 'Infant'] as const}
                  counts={[aC, cC, iC]}
                  rows={[legFares[i]?.adult ?? null, legFares[i]?.child ?? null, legFares[i]?.infant ?? null]}
                  grandTotal={legFares[i]?.total ?? 0}
                  serviceFee={legServiceFees[i] ?? 0}
                  gstPercentage={gstPercentage}
                />
              ))}
            </div>

            {/* Total */}
            <div style={{
              background: `linear-gradient(135deg,${O}12,${O}06)`,
              borderTop: `2px solid ${O}30`, padding: '16px 22px 20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: O,
                    letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 3 }}>Total Amount</div>
                  <div style={{ fontSize: 10.5, color: '#bbb' }}>Incl. all taxes &amp; fees</div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: O, letterSpacing: '-.01em' }}>
                  ₹ {grandTotalAmt.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Secure badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, marginTop: 12 }}>
            <span style={{ fontSize: 16 }}>🔒</span>
            <span style={{ fontSize: 11, color: '#aaa', fontWeight: 500 }}>Secure &amp; Encrypted Payment</span>
          </div>
        </div>
      </div>

      <CorpFooter />
    </div>
  );
}

export default function PassengerDetailsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#fdf6f2' }} />}>
      <PassengerDetailsContent />
    </Suspense>
  );
}
