'use client';
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Inter, Playfair_Display } from 'next/font/google';
import BookingProgress from '../components/BookingProgress';
import CorpHeader from '../components/CorpHeader';
import CorpFooter from '../components/CorpFooter';
import { PriceChangeNotice } from '../components/PriceChangeNotice';
import { useFlightPriceCheck, type PriceCheckLeg } from '../../hooks/useFlightPriceCheck';

const inter    = Inter({ subsets: ['latin'], weight: ['400','500','600','700','800'] });
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'], style: ['italic'] });

const O  = '#f07820';
const O2 = '#e86d18';
const PK = '#c9184a';

/* ─── Rates ─── */
const PAX_RATE = {
  adult:  { base: 1559, tax: 1720 },
  child:  { base: 1159, tax: 1420 },
  infant: { base:  499, tax:  580 },
} as const;

/* ─── Demo data (fallback only — real bookings carry this via URL from passenger-details) ─── */
const PASSENGERS: Passenger[] = [
  {
    title: 'Mr', firstName: 'Rajesh', lastName: 'Kumar', type: 'Adult',
    dob: '15 Mar 1988',
    passport: 'A1234567', nationality: 'Indian', issuingCountry: 'India', passportExpiry: '20 Jun 2030',
    ffAirline: 'IndiGo', ffNumber: '6E-RK98765',
  },
];
const CONTACT = { mobile: '+91 98765 43210', email: 'rajesh.kumar@example.com' };

/* Build contact details from the `countryCode`/`mobile`/`email` params passenger-details
 * forwards. Returns null when neither is present, so callers can fall back to demo data. */
function buildContactFromParams(sp: { get(key: string): string | null }): { mobile: string; email: string } | null {
  const mobile = sp.get('mobile');
  const email = sp.get('email');
  if (!mobile && !email) return null;
  const countryCode = sp.get('countryCode') ?? '+91';
  return { mobile: mobile ? `${countryCode} ${mobile}` : '', email: email ?? '' };
}

/* Company/GST details, only present when "I have a GST number" was checked on passenger-details
 * (see the gst* query params it sets right before navigating here). Returns null otherwise, so
 * this section simply doesn't render for bookings with no GST. */
function buildGstFromParams(sp: { get(key: string): string | null }): {
  companyName: string; registrationNo: string; gstNumber: string;
  pincode: string; stateName: string; address: string;
} | null {
  const companyName = sp.get('gstCompanyName');
  const gstNumber = sp.get('gstNo');
  if (!companyName || !gstNumber) return null;
  return {
    companyName,
    registrationNo: sp.get('gstRegNo') ?? '',
    gstNumber,
    pincode: sp.get('gstPin') ?? '',
    stateName: sp.get('gstStateName') ?? '',
    address: sp.get('gstAddress') ?? '',
  };
}

type Passenger = {
  title: string; firstName: string; lastName: string; type: 'Adult' | 'Child' | 'Infant';
  dob?: string; passport?: string; nationality?: string; issuingCountry?: string;
  passportIssue?: string; passportExpiry?: string; ffAirline?: string; ffNumber?: string;
};

type SegInfo = {
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

/* Convert a "DD/MM/YYYY" query param into "Weekday, Mon DD" for display, matching the demo
 * data's date format. Falls back to the raw string if it doesn't parse. */
function formatDisplayDate(ddmmyyyy: string): string {
  const [d, m, y] = ddmmyyyy.split('/');
  if (!d || !m || !y) return ddmmyyyy;
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  if (Number.isNaN(dt.getTime())) return ddmmyyyy;
  return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

/* Build a real flight segment from the query params passenger-details forwards. Returns null
 * when the expected params aren't present, so callers can fall back to demo data. */
function buildSegmentFromParams(
  sp: { get(key: string): string | null },
  prefix: string,
  label: 'outward' | 'return',
): SegInfo | null {
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
    date: formatDisplayDate(sp.get(`${prefix}_date`) ?? ''),
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

/* Builds the single combined /api/flights/price request for every real leg of this booking —
 * mirrors Laravel's preview_travel_show(), which calls flightDetail() a second time (after
 * passenger-details' own call) right before showing this same review page, comma-joining
 * flightIdCSV/sc across all legs rather than one call per leg. Returns null if any leg is
 * missing the scid/supplierCode/yatraId/price needed (e.g. a demo/fallback booking). */
function buildLivePriceRequest(
  sp: { get(key: string): string | null },
  isMulti: boolean,
  isRound: boolean,
  segCount: number,
): { searchId: string; supplierCode: string; flightId: string; price: number; originCountry: string; destinationCountry: string } | null {
  const prefixes = isMulti
    ? Array.from({ length: segCount }, (_, i) => `leg${i}`)
    : isRound ? ['out', 'ret'] : ['out'];

  const scids: string[] = [];
  const supplierCodes: string[] = [];
  const flightIds: string[] = [];
  const originCountries: string[] = [];
  const destinationCountries: string[] = [];
  let totalPrice = 0;

  for (const prefix of prefixes) {
    const scid = sp.get(`${prefix}_scid`);
    const supplierCode = sp.get(`${prefix}_supplierCode`);
    const yatraId = sp.get(`${prefix}_yatraId`);
    const price = Number(sp.get(`${prefix}_price`));
    if (!scid || !supplierCode || !yatraId || !price) return null;
    scids.push(scid);
    supplierCodes.push(supplierCode);
    flightIds.push(yatraId);
    originCountries.push(sp.get(`${prefix}_fromCountry`) ?? '');
    destinationCountries.push(sp.get(`${prefix}_toCountry`) ?? '');
    totalPrice += price;
  }

  return {
    searchId: scids[0],
    supplierCode: supplierCodes.join(','),
    flightId: flightIds.join(','),
    price: totalPrice,
    originCountry: originCountries.join(','),
    destinationCountry: destinationCountries.join(','),
  };
}

/* Rebuild the traveller list from the `${kind}N_*` params passenger-details forwards. */
function buildPassengersFromParams(sp: { get(key: string): string | null }): Passenger[] {
  const adults   = Math.max(0, parseInt(sp.get('adults')  ?? '0', 10) || 0);
  const children = Math.max(0, parseInt(sp.get('childs')  ?? '0', 10) || 0);
  const infants  = Math.max(0, parseInt(sp.get('infants') ?? '0', 10) || 0);

  function build(prefix: string, count: number, type: Passenger['type']): Passenger[] {
    return Array.from({ length: count }, (_, i) => {
      const p = `${prefix}${i + 1}`;
      return {
        title: sp.get(`${p}_title`) ?? '', firstName: sp.get(`${p}_first`) ?? '', lastName: sp.get(`${p}_last`) ?? '',
        type,
        dob: sp.get(`${p}_dob`) ?? undefined,
        passport: sp.get(`${p}_passport`) ?? undefined,
        nationality: sp.get(`${p}_nationality`) ?? undefined,
        issuingCountry: sp.get(`${p}_issuingCountry`) ?? undefined,
        passportIssue: sp.get(`${p}_passportIssue`) ?? undefined,
        passportExpiry: sp.get(`${p}_passportExpiry`) ?? undefined,
        ffAirline: sp.get(`${p}_ffAirline`) ?? undefined,
        ffNumber: sp.get(`${p}_ffNumber`) ?? undefined,
      };
    });
  }

  return [
    ...build('adult', adults, 'Adult'),
    ...build('child', children, 'Child'),
    ...build('infant', infants, 'Infant'),
  ];
}

const SEGMENTS: SegInfo[] = [
  {
    label: 'outward',
    from: 'Jaipur', to: 'New Delhi', fromCode: 'JAI', toCode: 'DEL',
    date: 'Thursday, Jul 30', stops: 'Non Stop', dur: '1 h 5 m',
    airlineCode: '6E', flightCode: '6E-6492', aircraft: 'Airbus A321',
    dep: '17:15', arr: '18:20',
    depTerminal: 'Terminal T-2',
    arrTerminal: 'Terminal T-1',
  },
  {
    label: 'return',
    from: 'New Delhi', to: 'Jaipur', fromCode: 'DEL', toCode: 'JAI',
    date: 'Friday, Jul 31', stops: 'Non Stop', dur: '1 h',
    airlineCode: '6E', flightCode: '6E-6190', aircraft: 'Airbus A320-100',
    dep: '07:40', arr: '08:40',
    depTerminal: 'Terminal T-1',
    arrTerminal: 'Terminal T-2',
  },
];

const INTL_SEGMENTS: SegInfo[] = [
  {
    label: 'outward',
    from: 'New Delhi', to: 'Bangkok', fromCode: 'DEL', toCode: 'BKK',
    date: 'Thursday, Jul 30', stops: 'Non Stop', dur: '5 h',
    airlineCode: '6E', flightCode: '6E-1401', aircraft: 'Airbus A321',
    dep: '23:30', arr: '05:30',
    depTerminal: 'Indira Gandhi International Airport, T-3',
    arrTerminal: 'Bangkok Suvarnabhumi International Airport, Terminal D',
  },
  {
    label: 'return',
    from: 'Bangkok', to: 'New Delhi', fromCode: 'BKK', toCode: 'DEL',
    date: 'Thursday, Aug 6', stops: 'Non Stop', dur: '4 h 30 m',
    airlineCode: '6E', flightCode: '6E-1402', aircraft: 'Airbus A321',
    dep: '06:30', arr: '10:00',
    depTerminal: 'Bangkok Suvarnabhumi International Airport, Terminal D',
    arrTerminal: 'Indira Gandhi International Airport, T-3',
  },
];

const INTL_PAX_RATE = {
  adult:  { base: 14200, tax: 4250 },
  child:  { base: 11500, tax: 3500 },
  infant: { base:  2800, tax:  800 },
} as const;

/* ─── Airline Logo ─── */
function AirlineLogo({ code, size = 22, radius = 5 }: { code: string; size?: number; radius?: number }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div style={{ width: size, height: size, borderRadius: radius, background: '#003580',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.34, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{code}</div>
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

/* ─── Compact flight card ─── */
function ReviewFlightCard({ seg, index = 0, isMulti = false }: { seg: SegInfo; index?: number; isMulti?: boolean }) {
  const isReturn = seg.label === 'return';
  const accent   = isMulti ? (index % 2 === 0 ? O : PK) : (isReturn ? PK : O);
  const dateBg   = accent === PK ? '#fce8ee' : '#fff3e0';
  const dateClr  = accent === PK ? PK : '#c8622a';
  return (
    <div style={{
      background: '#fff', borderRadius: 10,
      border: '1px solid #f0e8e8', borderLeft: `3px solid ${accent}`,
      padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,.04)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 800, color: accent,
            textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>
            {isMulti ? `Sector ${index + 1}` : (isReturn ? 'Return Flight' : 'Outward Flight')}
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e' }}>
            {seg.from} ({seg.fromCode}) → {seg.to} ({seg.toCode})
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ background: dateBg, color: dateClr, fontSize: 11, fontWeight: 700,
            padding: '3px 10px', borderRadius: 5, display: 'inline-block', marginBottom: 4 }}>
            {seg.date}
          </span>
          <div style={{ fontSize: 11.5, color: '#888' }}>{seg.stops} · {seg.dur}</div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ textAlign: 'left', minWidth: 60 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e', lineHeight: 1 }}>{seg.dep}</div>
          <div style={{ fontSize: 10.5, color: '#999', marginTop: 2 }}>{seg.from} ({seg.fromCode})</div>
          <div style={{ fontSize: 9.5, color: '#bbb' }}>{seg.depTerminal}</div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: 10.5, color: '#aaa' }}>{seg.dur}</div>
          <div style={{ width: '100%', height: 1.5, background: '#e8e0e0', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '50%', top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 7, height: 7, borderRadius: '50%', background: accent }} />
          </div>
          <div style={{ fontSize: 9.5, color: '#bbb' }}>{seg.stops}</div>
        </div>
        <div style={{ textAlign: 'right', minWidth: 60 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e', lineHeight: 1 }}>{seg.arr}</div>
          <div style={{ fontSize: 10.5, color: '#999', marginTop: 2 }}>{seg.to} ({seg.toCode})</div>
          <div style={{ fontSize: 9.5, color: '#bbb' }}>{seg.arrTerminal}</div>
        </div>
      </div>

      {/* Airline strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 10,
        borderTop: '1px dashed #f0e8e8' }}>
        <AirlineLogo code={seg.airlineCode} />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#444' }}>{seg.flightCode}</span>
        <span style={{ fontSize: 10.5, color: '#aaa', background: '#f5f5f5',
          padding: '2px 8px', borderRadius: 20 }}>{seg.aircraft}</span>
        <span style={{ marginLeft: 'auto', fontSize: 10.5, color: '#aaa' }}>
          Baggage: 15 kg + 5-7 kg cabin
        </span>
      </div>
    </div>
  );
}

/* ─── Section wrapper ─── */
function Section({ title, onEdit, children }: {
  title: string; onEdit?: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f0e8e8',
      boxShadow: '0 2px 12px rgba(0,0,0,.05)', overflow: 'hidden', marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 22px', borderBottom: '1px solid #f0e8e8' }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e', margin: 0 }}>{title}</h2>
        {onEdit && (
          <button onClick={onEdit} style={{
            background: 'none', border: `1.5px solid ${O}55`, borderRadius: 7,
            padding: '5px 16px', fontSize: 12, fontWeight: 700, color: O,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>✎ Edit</button>
        )}
      </div>
      <div style={{ padding: '16px 22px' }}>{children}</div>
    </div>
  );
}

/* ─── Fare Summary card (collapsible pax-wise / base-fare / additional-charges breakdown) ───
 * Mirrors the billing card used on the passenger-details step, so the fare breakdown looks
 * and behaves identically across both pages. */
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

/* ─── Billing sidebar ─── */
function BillingSidebar({ isRound, isMulti, isIntl, adultCount, childCount, infantCount, flightSegments }: {
  isRound: boolean; isMulti: boolean; isIntl: boolean; adultCount: number; childCount: number; infantCount: number;
  flightSegments: SegInfo[];
}) {
  const RATE = isIntl ? INTL_PAX_RATE : PAX_RATE;
  function fixedFare(kind: 'child' | 'infant', count: number) {
    if (count === 0) return null;
    const { base, tax } = RATE[kind];
    return { base: base * count, tax: tax * count, total: (base + tax) * count };
  }
  // The adult fare uses the REAL per-adult price carried over from the results page for that
  // specific leg when available, so the total here matches what was shown there — only falling
  // back to the flat estimate table when opened without a real search (demo data).
  function adultFare(seg: { price?: number } | undefined, count: number) {
    if (count === 0) return null;
    if (seg?.price) return { base: seg.price * count, tax: 0, total: seg.price * count };
    const { base, tax } = RATE.adult;
    return { base: base * count, tax: tax * count, total: (base + tax) * count };
  }

  const paxDesc = [
    adultCount  > 0 ? `${adultCount} Adult${adultCount  > 1 ? 's' : ''}` : '',
    childCount  > 0 ? `${childCount} Child${childCount  > 1 ? 'ren' : ''}` : '',
    infantCount > 0 ? `${infantCount} Infant${infantCount > 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ') || '1 Adult';

  const fallbackSegs: SegInfo[] = isRound
    ? [
        { label: 'outward', from: isIntl ? 'New Delhi' : 'Jaipur', to: isIntl ? 'Bangkok' : 'New Delhi', fromCode: isIntl ? 'DEL' : 'JAI', toCode: isIntl ? 'BKK' : 'DEL', date: 'Thu, Jul 30', stops: '', dur: '', airlineCode: '', flightCode: '', aircraft: '', dep: '', arr: '', depTerminal: '', arrTerminal: '' },
        { label: 'return', from: isIntl ? 'Bangkok' : 'New Delhi', to: isIntl ? 'New Delhi' : 'Jaipur', fromCode: isIntl ? 'BKK' : 'DEL', toCode: isIntl ? 'DEL' : 'JAI', date: isIntl ? 'Thu, Aug 6' : 'Fri, Jul 31', stops: '', dur: '', airlineCode: '', flightCode: '', aircraft: '', dep: '', arr: '', depTerminal: '', arrTerminal: '' },
      ]
    : [{ label: 'outward', from: isIntl ? 'New Delhi' : 'Jaipur', to: isIntl ? 'Bangkok' : 'New Delhi', fromCode: isIntl ? 'DEL' : 'JAI', toCode: isIntl ? 'BKK' : 'DEL', date: 'Thu, Jul 30', stops: '', dur: '', airlineCode: '', flightCode: '', aircraft: '', dep: '', arr: '', depTerminal: '', arrTerminal: '' }];
  const displaySegs: SegInfo[] = flightSegments.length > 0 ? flightSegments : fallbackSegs;
  const legCount = Math.max(1, displaySegs.length);

  const legFares = displaySegs.map(s => {
    const adult  = adultFare(s, adultCount);
    const child  = fixedFare('child', childCount);
    const infant = fixedFare('infant', infantCount);
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

  const gstFor = (fee: number) => Math.round((fee * gstPercentage) / 100);

  // Split the flat service fee evenly across legs, with any remainder on the first leg — for
  // legCount=2 this reproduces the original round-trip 50/50 split exactly (out gets the extra
  // rupee on odd totals, matching the previous outServiceFee/retServiceFee formula).
  const legServiceFees = Array.from({ length: legCount }, (_, i) => {
    const base = Math.floor(serviceFee / legCount);
    return i === 0 ? serviceFee - base * (legCount - 1) : base;
  });

  const grandTotalAmt = legFares.reduce((sum, lf, i) => sum + lf.total + (legServiceFees[i] ?? 0) + gstFor(legServiceFees[i] ?? 0), 0);

  return (
    <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden',
      border: '1px solid #f0e8e8', boxShadow: '0 8px 32px rgba(240,120,32,.12)', marginBottom: 12 }}>

      {/* Orange header */}
      <div style={{ background: `linear-gradient(135deg,${O} 0%,${O2} 100%)`, padding: '20px 22px' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,.75)',
          letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 10 }}>Price Summary</div>
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

      {/* Fare type row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 22px 0' }}>
        <div>
          <div style={{ fontSize: 9, color: '#bbb', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 5 }}>Fare Type</div>
          <div style={{ display: 'inline-flex', alignItems: 'center',
            background: `${O}14`, border: `1px solid ${O}44`, borderRadius: 6, padding: '3px 10px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: O }}>SAVER</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, color: '#bbb', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 5 }}>Travellers</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>{paxDesc}</div>
        </div>
      </div>

      <div style={{ height: 1, background: '#f0e8e8', margin: '14px 22px' }} />

      {/* Fare summary cards — collapsible pax-wise / base-fare / additional-charges breakdown.
       * One card per leg: round trip gets the familiar Outbound/Inbound pair, multi-city gets
       * one per sector, one-way gets a single card. */}
      <div style={{ padding: '0 22px 6px' }}>
        {displaySegs.map((s, i) => (
          <FareSummaryCard
            key={i}
            title={isRound ? (i === 0 ? 'Outbound Fare Summary' : 'Inbound Fare Summary')
              : isMulti ? `${s.from} (${s.fromCode}) → ${s.to} (${s.toCode}) Fare Summary` : 'Fare Summary'}
            accent={i % 2 === 0 ? O : PK}
            kinds={['Adult', 'Child', 'Infant'] as const}
            counts={[adultCount, childCount, infantCount]}
            rows={[legFares[i]?.adult ?? null, legFares[i]?.child ?? null, legFares[i]?.infant ?? null]}
            grandTotal={legFares[i]?.total ?? 0}
            serviceFee={legServiceFees[i] ?? 0}
            gstPercentage={gstPercentage}
          />
        ))}
      </div>

      {/* Total */}
      <div style={{ background: `linear-gradient(135deg,${O}12,${O}06)`,
        borderTop: `2px solid ${O}30`, padding: '16px 22px 20px' }}>
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
  );
}

/* ─── Main content ─── */
function ReviewContent() {
  const searchParams = useSearchParams();
  const isRound = searchParams.get('trip') === 'round';
  const isMulti = searchParams.get('trip') === 'multi';
  const isIntl  = searchParams.get('type') === 'international';
  const tripBack = (isRound ? '?trip=round' : '?trip=one-way') + (isIntl ? '&type=international' : '');

  /* Real booking data carried in via URL from passenger-details; falls back to demo data
   * when the page is opened directly without a real search/booking flow. */
  let realSegments: SegInfo[] = [];
  if (isMulti) {
    const noSeg = Number(searchParams.get('no_segments')) || 0;
    for (let i = 0; i < noSeg; i++) {
      const seg = buildSegmentFromParams(searchParams, `leg${i}`, 'outward');
      if (seg) realSegments.push(seg);
    }
  } else {
    const realOutSeg  = buildSegmentFromParams(searchParams, 'out', 'outward');
    const realRetSeg  = isRound ? buildSegmentFromParams(searchParams, 'ret', 'return') : null;
    realSegments = [realOutSeg, realRetSeg].filter((s): s is SegInfo => s !== null);
  }
  const demoSegments = isIntl ? INTL_SEGMENTS : SEGMENTS;
  const activeSegments = realSegments.length > 0 ? realSegments : (isRound ? demoSegments : [demoSegments[0]]);

  const realPassengers   = buildPassengersFromParams(searchParams);
  const activePassengers = realPassengers.length > 0 ? realPassengers : PASSENGERS;

  const activeContact = buildContactFromParams(searchParams) ?? CONTACT;
  const activeGst = buildGstFromParams(searchParams);

  const parseCount = (raw: string | null, fallback: number) => {
    const n = parseInt(raw ?? '', 10);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  const hasRealBooking = realSegments.length > 0;
  const adultCount  = parseCount(searchParams.get('adults'),  hasRealBooking ? 0 : 1);
  const childCount  = parseCount(searchParams.get('childs'),  0);
  const infantCount = parseCount(searchParams.get('infants'), 0);

  const priceCheckLegs = buildPriceCheckLegs(searchParams, isMulti, isRound, realSegments.length);
  const { changes: priceChanges, dismiss: dismissPriceChanges } =
    useFlightPriceCheck(searchParams.get('origSearch'), priceCheckLegs);

  // Live Yatra pricing re-check — mirrors Laravel's preview_travel_show() calling flightDetail()
  // a second time before showing this review page. Verification-only: the result isn't threaded
  // into the "Confirm & Pay" navigation below (which still forwards searchParams.toString()
  // untouched), so this doesn't change anything payment-details/booking creation receives.
  const [liveFlightsData, setLiveFlightsData] = useState<unknown>(null);
  useEffect(() => {
    const req = buildLivePriceRequest(searchParams, isMulti, isRound, realSegments.length);
    if (!req) return;
    let cancelled = false;
    const qs = new URLSearchParams({
      searchId: req.searchId, supplierCode: req.supplierCode, flightId: req.flightId,
      price: String(req.price), originCountry: req.originCountry, destinationCountry: req.destinationCountry,
    });
    fetch(`/api/flights/price?${qs.toString()}`)
      .then(res => res.json())
      .then(json => { if (!cancelled && json?.status) setLiveFlightsData(json.data); })
      .catch(() => { /* best-effort — review page still works off the trusted client price */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={inter.className} style={{ background: '#fdf6f2', minHeight: '100vh', color: '#1a1a2e' }}>
      <PriceChangeNotice changes={priceChanges} onDismiss={dismissPriceChanges} />

      {/* NAV */}
      <CorpHeader />

      {/* STEPPER */}
      <div style={{ padding: '20px 0 0' }}>
        <BookingProgress step={4} />
      </div>

      {/* HERO */}
      <div style={{ background: 'linear-gradient(135deg,#f07820 0%,#c8622a 55%,#7a3010 100%)',
        padding: '28px 5%', textAlign: 'center', marginTop: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>
          Review Your Booking
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,.8)', margin: '0 0 16px' }}>
          Please verify all details carefully before proceeding to payment.
        </p>
        <div style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {['Flight Details', 'Passenger Info', 'Fare Breakdown'].map((s, i) => (
            <div key={i} style={{ padding: '5px 16px', background: 'rgba(255,255,255,.18)',
              borderRadius: 20, fontSize: 12, fontWeight: 600, color: '#fff',
              border: '1px solid rgba(255,255,255,.3)' }}>{s}</div>
          ))}
        </div>
      </div>

      {/* TWO-COLUMN LAYOUT */}
      <div style={{ display: 'flex', gap: 22, padding: '26px 5%', maxWidth: 1280,
        margin: '0 auto', width: '100%', boxSizing: 'border-box', alignItems: 'flex-start' }}>

        {/* ── LEFT ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Flight Itinerary */}
          <Section title="Flight Itinerary"
            onEdit={() => window.location.href = `/corporate/passenger-details${tripBack}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeSegments.map((seg, i) => (
                <ReviewFlightCard key={i} seg={seg} index={i} isMulti={isMulti} />
              ))}
            </div>
          </Section>

          {/* Passenger Details */}
          <Section title="Passenger Details"
            onEdit={() => window.location.href = `/corporate/passenger-details${tripBack}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activePassengers.map((p, idx) => (
                <div key={idx} style={{ border: '1px solid #f0e8e8', borderRadius: 10, overflow: 'hidden' }}>
                  {/* Name row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 16px', background: '#fafafa' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%',
                      background: `${O}14`, border: `1.5px solid ${O}44`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, flexShrink: 0 }}>👤</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 800, color: '#1a1a2e' }}>
                        {p.title}. {p.firstName} {p.lastName}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#aaa', marginTop: 2 }}>{p.type}</div>
                      {isIntl && p.dob && (
                        <div style={{ fontSize: 11.5, color: '#aaa', marginTop: 2 }}>Date of Birth: {p.dob}</div>
                      )}
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: '#eafaf2', border: '1px solid #a3d9b8',
                      borderRadius: 20, padding: '3px 12px', flexShrink: 0 }}>
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                        <circle cx="5.5" cy="5.5" r="5.5" fill="#2d8a4e"/>
                        <path d="M3 5.5L4.8 7.3L8 4" stroke="#fff" strokeWidth="1.5"
                          strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#2d8a4e' }}>Verified</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Contact Details */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f0e8e8',
            boxShadow: '0 2px 12px rgba(0,0,0,.05)', overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 22px', borderBottom: '1px solid #f0e8e8' }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: PK, margin: 0 }}>
                Booking Details Will Be Set To
              </h2>
              <button onClick={() => window.location.href = `/corporate/passenger-details${tripBack}`}
                style={{ background: 'none', border: `1.5px solid ${O}55`, borderRadius: 7,
                  padding: '5px 16px', fontSize: 12, fontWeight: 700, color: O,
                  cursor: 'pointer', fontFamily: 'inherit' }}>✎ Edit</button>
            </div>
            <div style={{ padding: '16px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0,
                background: '#fafafa', border: '1px solid #f0e8e8', borderRadius: 9,
                overflow: 'hidden' }}>
                {[
                  { label: 'Mobile No', value: activeContact.mobile },
                  { label: 'Email',     value: activeContact.email  },
                ].map((row, i) => (
                  <div key={row.label} style={{
                    flex: 1, padding: '14px 20px',
                    borderRight: i === 0 ? '1px solid #f0e8e8' : 'none',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>
                      {row.label}
                    </div>
                    <div style={{ fontSize: 13.5, color: '#444', fontWeight: 500 }}>{row.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Company / GST Details — only shown when "I have a GST number" was checked */}
          {activeGst && (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f0e8e8',
              boxShadow: '0 2px 12px rgba(0,0,0,.05)', overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 22px', borderBottom: '1px solid #f0e8e8' }}>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: PK, margin: 0 }}>
                  Company / GST Details
                </h2>
                <button onClick={() => window.location.href = `/corporate/passenger-details${tripBack}`}
                  style={{ background: 'none', border: `1.5px solid ${O}55`, borderRadius: 7,
                    padding: '5px 16px', fontSize: 12, fontWeight: 700, color: O,
                    cursor: 'pointer', fontFamily: 'inherit' }}>✎ Edit</button>
              </div>
              <div style={{ padding: '16px 22px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                  background: '#fafafa', border: '1px solid #f0e8e8', borderRadius: 9,
                  overflow: 'hidden' }}>
                  {[
                    { label: 'Company Name',    value: activeGst.companyName },
                    { label: 'Registration No', value: activeGst.registrationNo || '—' },
                    { label: 'GST Number',      value: activeGst.gstNumber },
                    { label: 'Pin Code',        value: activeGst.pincode || '—' },
                    { label: 'State',           value: activeGst.stateName || '—' },
                    { label: 'Address',         value: activeGst.address || '—' },
                  ].map((row, i) => (
                    <div key={row.label} style={{
                      padding: '14px 20px',
                      borderRight: i % 3 !== 2 ? '1px solid #f0e8e8' : 'none',
                      borderTop: i >= 3 ? '1px solid #f0e8e8' : 'none',
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>
                        {row.label}
                      </div>
                      <div style={{ fontSize: 13.5, color: '#444', fontWeight: 500 }}>{row.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Important Info */}
          <div style={{ background: '#fffbf0', border: '1px solid #ffe0a0', borderRadius: 10,
            padding: '14px 18px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 6 }}>
                  Important Information
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#666',
                  display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <li>Please carry a valid photo ID matching the traveller name.</li>
                  {isIntl && <li>Carry your original passport. Passport must be valid for at least 6 months beyond travel date.</li>}
                  {isIntl && <li>Ensure your visa for Thailand is valid before departure.</li>}
                  <li>Web check-in opens 48 hours before departure.</li>
                  <li>Arrive at the airport at least {isIntl ? '3 hours' : '90 minutes'} before departure.</li>
                  <li>This fare is non-refundable. Cancellation fees apply.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT — Billing + CTA ── */}
        <div style={{ width: 292, flexShrink: 0, position: 'sticky', top: 82 }}>
          <BillingSidebar isRound={isRound} isMulti={isMulti} isIntl={isIntl}
            adultCount={adultCount} childCount={childCount} infantCount={infantCount}
            flightSegments={activeSegments} />

          {/* Secure badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, marginBottom: liveFlightsData ? 4 : 16 }}>
            <span style={{ fontSize: 15 }}>🔒</span>
            <span style={{ fontSize: 11, color: '#aaa', fontWeight: 500 }}>Secure &amp; Encrypted Payment</span>
          </div>

          {/* Live fare re-check confirmation — purely informational, doesn't affect the amount
             charged or what's sent to payment-details. */}
          {liveFlightsData ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 5, marginBottom: 16 }}>
              <span style={{ fontSize: 11, color: '#2d8a4e', fontWeight: 600 }}>✓ Live fare verified with airline</span>
            </div>
          ) : null}

          {/* Confirm button */}
          <button
            onClick={() => { window.location.href = `/corporate/payment-details?${searchParams.toString()}`; }}
            style={{
              width: '100%', padding: '14px 0',
              background: `linear-gradient(135deg,${O},${O2})`,
              color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 800, cursor: 'pointer',
              fontFamily: 'inherit', letterSpacing: '.02em',
              boxShadow: `0 6px 20px ${O}55`, marginBottom: 10,
            }}>
            Confirm &amp; Proceed to Payment
          </button>

          <button
            onClick={() => window.history.back()}
            style={{
              width: '100%', padding: '10px 0',
              background: 'none', border: '1.5px solid #e8e0e0',
              borderRadius: 10, fontSize: 13, fontWeight: 700,
              color: '#888', cursor: 'pointer', fontFamily: 'inherit',
            }}>
            ← Back to Passenger Details
          </button>
        </div>
      </div>

      <CorpFooter />
    </div>
  );
}

export default function ReviewBookingPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#fdf6f2' }} />}>
      <ReviewContent />
    </Suspense>
  );
}
