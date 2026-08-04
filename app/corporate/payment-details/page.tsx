'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { Inter, Playfair_Display } from 'next/font/google';
import BookingProgress from '../components/BookingProgress';
import CorpHeader from '../components/CorpHeader';
import CorpFooter from '../components/CorpFooter';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useConvenienceFee } from '../../hooks/useConvenienceFee';
import { useFlightPriceCheck, type PriceCheckLeg } from '../../hooks/useFlightPriceCheck';
import { PriceChangeNotice } from '../components/PriceChangeNotice';
import { useWalletBalance } from '../../hooks/useWalletBalance';

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const inter    = Inter({ subsets: ['latin'], weight: ['400','500','600','700','800'] });
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'], style: ['italic'] });

const O  = '#f07820';
const O2 = '#e86d18';
const PK = '#c9184a';

/* ─── Rates (fake per-pax tables — matches results/passenger-details/review-booking, since
 * there's no real fare API to price these against) ─── */
const PAX_RATE = {
  adult:  { base: 1559, tax: 1720 },
  child:  { base: 1159, tax: 1420 },
  infant: { base:  499, tax:  580 },
} as const;
const INTL_PAX_RATE = {
  adult:  { base: 14200, tax: 4250 },
  child:  { base: 11500, tax: 3500 },
  infant: { base:  2800, tax:  800 },
} as const;

/* ─── Demo data (fallback only — real bookings carry this via URL from review-booking) ─── */
const PASSENGERS: Passenger[] = [
  {
    title: 'Mr', firstName: 'Rajesh', lastName: 'Kumar', type: 'Adult',
    dob: '15 Mar 1988',
    passport: 'A1234567', nationality: 'Indian', issuingCountry: 'India', passportExpiry: '20 Jun 2030',
    ffAirline: 'IndiGo', ffNumber: '6E-RK98765',
  },
];
const CONTACT = { countryCode: '+91', mobile: '9876543210', email: 'rajesh.kumar@example.com' };

type Passenger = {
  title: string; firstName: string; lastName: string; type: 'Adult' | 'Child' | 'Infant';
  dob?: string; passport?: string; nationality?: string; issuingCountry?: string;
  passportIssue?: string; passportExpiry?: string;
  ffAirline?: string; ffNumber?: string;
};

type SegInfo = {
  label: 'outward' | 'return';
  from: string; to: string;
  /** Airport codes (e.g. "JAI"/"DEL") — the same codes used to query /api/flights/search,
   * carried through untouched for booking_root.bookingroot / origin / destination. Distinct from
   * `from`/`to`, which are stripped down to a plain city name for on-screen display. */
  fromCode: string; toCode: string;
  /** Full "City, Country (CODE)" label from the search form (e.g. "Jaipur, India (JAI)") and the
   * 2-letter country code (e.g. "IN") — for booking_root.origin_city/destination_city and
   * .origin_country/destination_country. */
  fromCityFull: string; toCityFull: string;
  fromCountry: string; toCountry: string;
  date: string; rawDate: string; stops: string; dur: string;
  airlineCode: string; flightCode: string;
  /** Yatra's `yatraId` for the selected fare on this sector — carried through to
   * booking.flight_id. Empty for demo segments (no real fare was ever selected). */
  yatraId: string;
  /** Fare bundle name the user picked on results (e.g. "SME Fare", "Flexi Plus") — carried
   * through to booking.flight_fare_type. Empty for demo segments. */
  fareId: string;
  dep: string; arr: string;
  price?: number; // real per-adult fare carried over from results — undefined for demo segments
};

const SEGMENTS: SegInfo[] = [
  { label: 'outward', from: 'Jaipur', to: 'New Delhi', fromCode: 'JAI', toCode: 'DEL',
    fromCityFull: 'Jaipur, India (JAI)', toCityFull: 'New Delhi, India (DEL)', fromCountry: 'IN', toCountry: 'IN',
    date: 'Thursday, Jul 30', rawDate: '30/07/2026',
    stops: 'Non Stop', dur: '1h 5m', airlineCode: '6E', flightCode: '6E-6492', yatraId: '', fareId: '', dep: '17:15', arr: '18:20' },
  { label: 'return', from: 'New Delhi', to: 'Jaipur', fromCode: 'DEL', toCode: 'JAI',
    fromCityFull: 'New Delhi, India (DEL)', toCityFull: 'Jaipur, India (JAI)', fromCountry: 'IN', toCountry: 'IN',
    date: 'Friday, Jul 31', rawDate: '31/07/2026',
    stops: 'Non Stop', dur: '1h', airlineCode: '6E', flightCode: '6E-6190', yatraId: '', fareId: '', dep: '07:40', arr: '08:40' },
];
const INTL_SEGMENTS: SegInfo[] = [
  { label: 'outward', from: 'New Delhi', to: 'Bangkok', fromCode: 'DEL', toCode: 'BKK',
    fromCityFull: 'New Delhi, India (DEL)', toCityFull: 'Bangkok, Thailand (BKK)', fromCountry: 'IN', toCountry: 'TH',
    date: 'Thursday, Jul 30', rawDate: '30/07/2026',
    stops: 'Non Stop', dur: '5h', airlineCode: '6E', flightCode: '6E-1401', yatraId: '', fareId: '', dep: '23:30', arr: '05:30' },
  { label: 'return', from: 'Bangkok', to: 'New Delhi', fromCode: 'BKK', toCode: 'DEL',
    fromCityFull: 'Bangkok, Thailand (BKK)', toCityFull: 'New Delhi, India (DEL)', fromCountry: 'TH', toCountry: 'IN',
    date: 'Thursday, Aug 6', rawDate: '06/08/2026',
    stops: 'Non Stop', dur: '4h 30m', airlineCode: '6E', flightCode: '6E-1402', yatraId: '', fareId: '', dep: '06:30', arr: '10:00' },
];

/* Convert a "DD/MM/YYYY" query param into "Weekday, Mon DD" for display. */
function formatDisplayDate(ddmmyyyy: string): string {
  const [d, m, y] = ddmmyyyy.split('/');
  if (!d || !m || !y) return ddmmyyyy;
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  if (Number.isNaN(dt.getTime())) return ddmmyyyy;
  return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

/* Build a real flight segment from the query params review-booking forwards. Returns null when
 * the expected params aren't present, so callers can fall back to demo data. */
function buildSegmentFromParams(
  sp: { get(key: string): string | null },
  prefix: string,
  label: 'outward' | 'return',
): SegInfo | null {
  const from = sp.get(`${prefix}_from`);
  const to = sp.get(`${prefix}_to`);
  if (!from || !to) return null;
  const stripCity = (s: string) => s.replace(/\s*\(.*?\)$/, '').split(',')[0].trim();
  // Same "City, Country (CODE)" label the flight search results carry — pull the airport code
  // back out instead of discarding it, so booking_root.bookingroot ends up "JAI-DEL", not
  // "Jaipur-New Delhi".
  const extractCode = (s: string) => (s.match(/\(([^)]+)\)\s*$/)?.[1] ?? s).trim();
  const rawDate = sp.get(`${prefix}_date`) ?? '';
  return {
    label,
    from: stripCity(from),
    to: stripCity(to),
    fromCode: extractCode(from),
    toCode: extractCode(to),
    fromCityFull: sp.get(`${prefix}_fromFull`) || from,
    toCityFull: sp.get(`${prefix}_toFull`) || to,
    fromCountry: sp.get(`${prefix}_fromCountry`) ?? '',
    toCountry: sp.get(`${prefix}_toCountry`) ?? '',
    date: formatDisplayDate(rawDate),
    rawDate,
    stops: sp.get(`${prefix}_stops`) ?? '',
    dur: sp.get(`${prefix}_dur`) ?? '',
    airlineCode: sp.get(`${prefix}_airCode`) ?? '',
    flightCode: sp.get(`${prefix}_flightCode`) ?? '',
    yatraId: sp.get(`${prefix}_yatraId`) ?? '',
    fareId: sp.get(`${prefix}_fareId`) ?? '',
    dep: sp.get(`${prefix}_dep`) ?? '',
    arr: sp.get(`${prefix}_arr`) ?? '',
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

/* Build contact details from the `countryCode`/`mobile`/`email` params. Returns null when
 * neither is present, so callers can fall back to demo data. */
function buildContactFromParams(sp: { get(key: string): string | null }): { countryCode: string; mobile: string; email: string } | null {
  const mobile = sp.get('mobile');
  const email = sp.get('email');
  if (!mobile && !email) return null;
  return { countryCode: sp.get('countryCode') ?? '+91', mobile: mobile ?? '', email: email ?? '' };
}

/* ─── Payment modes ─── */
type Mode = 'upi' | 'netbanking' | 'credit' | 'debit' | 'creditpool';
const MODES: { id: Mode; label: string; sub: string; icon: string }[] = [
  { id: 'upi',        label: 'UPI',         sub: 'Google Pay, PhonePe, Paytm',      icon: '📲' },
  { id: 'netbanking', label: 'Net Banking', sub: 'All major banks supported',       icon: '🏦' },
  { id: 'credit',     label: 'Credit Card', sub: 'Visa, Mastercard, Amex',          icon: '💳' },
  { id: 'debit',      label: 'Debit Card',  sub: 'All major banks',                 icon: '🏧' },
  { id: 'creditpool', label: 'Creditpool',  sub: 'Use your travel credit balance',  icon: '💰' },
];
const CHECKOUT_BLOCK: Record<Exclude<Mode, 'creditpool'>, { name: string; instruments: Array<{ method: string; types?: string[] }> }> = {
  upi:        { name: 'UPI',         instruments: [{ method: 'upi' }] },
  netbanking: { name: 'Net Banking', instruments: [{ method: 'netbanking' }] },
  credit:     { name: 'Credit Card', instruments: [{ method: 'card', types: ['credit'] }] },
  debit:      { name: 'Debit Card',  instruments: [{ method: 'card', types: ['debit'] }] },
};
// Matches payment_modes.id — used to look up the right convenience_fee row for whichever mode
// is currently selected.
const MODE_ID: Record<Mode, string> = { upi: '1', netbanking: '2', credit: '3', debit: '4', creditpool: '5' };

/* ─── Airline Logo ─── */
function AirlineLogo({ code, size = 20, radius = 4 }: { code: string; size?: number; radius?: number }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div style={{ width: size, height: size, borderRadius: radius, background: '#003580',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.35, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{code}</div>
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

/* ─── Flight card ─── */
function FlightSummaryCard({ seg, index = 0, isMulti = false }: { seg: SegInfo; index?: number; isMulti?: boolean }) {
  const isReturn = seg.label === 'return';
  const accent   = isMulti ? (index % 2 === 0 ? O : PK) : (isReturn ? PK : O);
  return (
    <div style={{ background: '#fafafa', border: '1px solid #f0e8e8',
      borderLeft: `3px solid ${accent}`, borderRadius: 9, padding: '12px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 800, color: accent,
            textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>
            {isMulti ? `Sector ${index + 1}` : (isReturn ? 'Return Flight' : 'Outward Flight')}
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: '#1a1a2e' }}>
            {seg.from} → {seg.to}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>{seg.date}</div>
          <div style={{ fontSize: 11, color: accent, fontWeight: 600 }}>{seg.dur} · {seg.stops}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#1a1a2e' }}>{seg.dep}</div>
          <div style={{ fontSize: 10, color: '#aaa' }}>{seg.from} ({seg.fromCode})</div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div style={{ width: '100%', height: 1.5, background: '#e8e0e0', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '50%', top: '50%',
              transform: 'translate(-50%,-50%)',
              width: 6, height: 6, borderRadius: '50%', background: accent }} />
          </div>
          <div style={{ fontSize: 10, color: '#bbb' }}>{seg.dur}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#1a1a2e' }}>{seg.arr}</div>
          <div style={{ fontSize: 10, color: '#aaa' }}>{seg.to} ({seg.toCode})</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10,
        paddingTop: 8, borderTop: '1px dashed #f0e8e8' }}>
        <AirlineLogo code={seg.airlineCode} />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#555' }}>{seg.flightCode}</span>
        <span style={{ fontSize: 10.5, color: '#aaa', marginLeft: 'auto' }}>
          Baggage: 15 kg + 5-7 kg cabin
        </span>
      </div>
    </div>
  );
}

/* ─── Fare Summary card — same collapsible pax-wise / base-fare / additional-charges breakdown
 * used on review-booking's billing sidebar, so the fare view looks and behaves identically
 * across both pages. ─── */
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

      <div style={{ padding: '4px 16px', background: '#fff', borderBottom: '1px solid #f5efe9' }}>
        <span onClick={() => setShowDetails(p => !p)} style={{
          fontSize: 10.5, color: accent, fontWeight: 700, letterSpacing: '.02em', lineHeight: 1.15,
          textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer', display: 'inline-block' }}>
          {showDetails ? '− Hide Details' : '+ Show Details'}
        </span>
      </div>

      {showDetails && (
        <>
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

/* ─── Page content ─── */
function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: userLoading } = useCurrentUser();

  useEffect(() => {
    if (!userLoading && !user) router.push('/');
  }, [userLoading, user, router]);

  const { balance } = useWalletBalance(!!user);

  const isRound = searchParams.get('trip') === 'round';
  const isMulti = searchParams.get('trip') === 'multi';
  const isIntl  = searchParams.get('type') === 'international';

  const [selectedMode, setSelectedMode] = useState<Mode>('upi');
  const [payStatus, setPayStatus] = useState<'idle' | 'processing'>('idle');
  const [error, setError] = useState('');
  const [scriptReady, setScriptReady] = useState(false);

  /* Real booking data carried in via URL from review-booking; falls back to demo data when the
   * page is opened directly without a real search/booking flow. */
  let realSegments: SegInfo[] = [];
  if (isMulti) {
    const noSeg = Number(searchParams.get('no_segments')) || 0;
    for (let i = 0; i < noSeg; i++) {
      const seg = buildSegmentFromParams(searchParams, `leg${i}`, 'outward');
      if (seg) realSegments.push(seg);
    }
  } else {
    const realOutSeg = buildSegmentFromParams(searchParams, 'out', 'outward');
    const realRetSeg = isRound ? buildSegmentFromParams(searchParams, 'ret', 'return') : null;
    realSegments = [realOutSeg, realRetSeg].filter((s): s is SegInfo => s !== null);
  }
  const demoSegments = isIntl ? INTL_SEGMENTS : SEGMENTS;
  const activeSegments = realSegments.length > 0 ? realSegments : (isRound ? demoSegments : [demoSegments[0]]);
  const hasRealBooking = realSegments.length > 0;

  const realPassengers   = buildPassengersFromParams(searchParams);
  const activePassengers = realPassengers.length > 0 ? realPassengers : PASSENGERS;

  const realContact   = buildContactFromParams(searchParams);
  const activeContact  = realContact ?? CONTACT;

  const parseCount = (raw: string | null, fallback: number) => {
    const n = parseInt(raw ?? '', 10);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  const adultCount  = parseCount(searchParams.get('adults'),  hasRealBooking ? 0 : 1);
  const childCount  = parseCount(searchParams.get('childs'),  0);
  const infantCount = parseCount(searchParams.get('infants'), 0);

  const paxDesc = [
    adultCount  > 0 ? `${adultCount} Adult${adultCount  > 1 ? 's' : ''}` : '',
    childCount  > 0 ? `${childCount} Child${childCount  > 1 ? 'ren' : ''}` : '',
    infantCount > 0 ? `${infantCount} Infant${infantCount > 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ') || '1 Adult';

  /* ── Fare math — identical formula to review-booking's BillingSidebar, so the total shown
   * here matches what the user already confirmed on the previous step. The adult fare uses the
   * REAL per-adult price carried over from the results page for that specific leg when
   * available (falling back to the flat estimate table only for demo data); the flat service
   * fee is split evenly across legs (remainder on the first), which for legCount=2 reproduces
   * the original round-trip 50/50 split exactly. ── */
  const RATE = isIntl ? INTL_PAX_RATE : PAX_RATE;
  function fixedFare(kind: 'child' | 'infant', count: number) {
    if (count === 0) return null;
    const { base, tax } = RATE[kind];
    return { base: base * count, tax: tax * count, total: (base + tax) * count };
  }
  function adultFare(seg: SegInfo | undefined, count: number) {
    if (count === 0) return null;
    if (seg?.price) return { base: seg.price * count, tax: 0, total: seg.price * count };
    const { base, tax } = RATE.adult;
    return { base: base * count, tax: tax * count, total: (base + tax) * count };
  }
  const legCount = Math.max(1, activeSegments.length);
  const legFares = activeSegments.map(s => {
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
  const legServiceFees = Array.from({ length: legCount }, (_, i) => {
    const base = Math.floor(serviceFee / legCount);
    return i === 0 ? serviceFee - base * (legCount - 1) : base;
  });
  const grandTotalAmt = legFares.reduce((sum, lf, i) => sum + lf.total + (legServiceFees[i] ?? 0) + gstFor(legServiceFees[i] ?? 0), 0);
  const sector = isRound ? 'R' : isMulti ? 'M' : 'O';

  // Convenience fee depends on the selected payment mode — never applies to Creditpool, so that
  // mode passes null to skip the fetch entirely rather than relying on the convenience_fee table
  // just happening to have no matching row.
  const convenienceFee = useConvenienceFee(selectedMode === 'creditpool' ? null : MODE_ID[selectedMode], sector, grandTotalAmt);
  const finalTotalAmt = grandTotalAmt + convenienceFee;

  // Credit Pool spends the Main Balance first, then draws on OD — usable as long as the total
  // Credit Pool (odLimit + walletBalance) covers the amount. Until the balance has loaded we
  // don't know yet, so it stays selectable rather than flashing disabled/enabled.
  const creditpoolInsufficient = balance !== null && balance.creditPool < finalTotalAmt;
  useEffect(() => {
    if (creditpoolInsufficient && selectedMode === 'creditpool') setSelectedMode('upi');
  }, [creditpoolInsufficient, selectedMode]);

  const canPay = payStatus !== 'processing' && (selectedMode === 'creditpool' || scriptReady);

  async function handlePay() {
    setError('');
    setPayStatus('processing');

    const bookingPayload = {
      countryCode: activeContact.countryCode,
      mobile: activeContact.mobile,
      email: activeContact.email,
      adt: adultCount, chd: childCount, inf: infantCount,
      travelClass: 'Economy',
      tripLabel: sector,
      sectors: activeSegments.map(s => ({
        originCity: s.fromCityFull, destinationCity: s.toCityFull,
        originCode: s.fromCode, destinationCode: s.toCode,
        originCountry: s.fromCountry, destinationCountry: s.toCountry,
        flightDepartDateRaw: s.rawDate,
        flightNo: s.flightCode,
        flightId: s.yatraId,
        fareType: s.fareId,
      })),
      passengers: activePassengers.map(p => ({
        title: p.title, firstName: p.firstName, lastName: p.lastName, type: p.type,
        dob: p.dob, nationality: p.nationality, passport: p.passport,
        issuingCountry: p.issuingCountry, passportExpiry: p.passportExpiry,
      })),
      totalFlightAmt,
      serviceFee,
      convenienceFee,
      totalPayableAmt: finalTotalAmt,
      gst: searchParams.get('gstCompanyName') && searchParams.get('gstNo') ? {
        companyName: searchParams.get('gstCompanyName') ?? '',
        registrationNo: searchParams.get('gstRegNo') ?? '',
        gstNumber: searchParams.get('gstNo') ?? '',
        pincode: searchParams.get('gstPin') ?? '',
        stateName: searchParams.get('gstStateName') ?? '',
        address: searchParams.get('gstAddress') ?? '',
      } : undefined,
    };

    try {
      if (selectedMode === 'creditpool') {
        const res = await fetch('/api/bookings/create', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookingPayload),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? 'Payment failed.'); setPayStatus('idle'); return; }
        window.location.href = `/corporate/booking-confirmation?ref=${encodeURIComponent(data.ref)}`;
        return;
      }

      const orderRes = await fetch('/api/payments/razorpay/booking/create-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: finalTotalAmt }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) { setError(order.error ?? 'Failed to initiate payment.'); setPayStatus('idle'); return; }

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: Math.round(order.amount * 100),
        currency: 'INR',
        name: 'Shree Kalyanam',
        description: 'Flight Booking Payment',
        order_id: order.orderId,
        prefill: { name: user?.name, email: activeContact.email, contact: activeContact.mobile },
        theme: { color: O },
        config: {
          display: {
            blocks: { highlighted: CHECKOUT_BLOCK[selectedMode] },
            sequence: ['block.highlighted'],
            preferences: { show_default_blocks: false },
          },
        },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          setPayStatus('processing');
          try {
            const verifyRes = await fetch('/api/payments/razorpay/booking/verify', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                mode: selectedMode,
                booking: bookingPayload,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              setError(verifyData.error ?? 'Payment verification failed. Please contact support.');
              setPayStatus('idle');
              return;
            }
            window.location.href = `/corporate/booking-confirmation?ref=${encodeURIComponent(verifyData.ref)}`;
          } catch {
            setError('Payment succeeded but booking creation failed. Please contact support.');
            setPayStatus('idle');
          }
        },
        modal: { ondismiss: () => setPayStatus('idle') },
      });
      rzp.open();
      setPayStatus('idle');
    } catch {
      setError('Something went wrong. Please try again.');
      setPayStatus('idle');
    }
  }

  const priceCheckLegs = buildPriceCheckLegs(searchParams, isMulti, isRound, realSegments.length);
  const { changes: priceChanges, dismiss: dismissPriceChanges } =
    useFlightPriceCheck(searchParams.get('origSearch'), priceCheckLegs);

  if (userLoading) {
    return <div style={{ minHeight: '100vh', background: '#fdf6f2' }} />;
  }

  return (
    <div className={inter.className} style={{ background: '#fdf6f2', minHeight: '100vh', color: '#1a1a2e' }}>
      <PriceChangeNotice changes={priceChanges} onDismiss={dismissPriceChanges} />

      {/* NAV */}
      <CorpHeader />

      {/* STEPPER */}
      <div style={{ padding: '20px 0 0' }}>
        <BookingProgress step={5} />
      </div>

      {/* HERO */}
      <div style={{ background: 'linear-gradient(135deg,#f07820 0%,#c8622a 55%,#7a3010 100%)',
        padding: '28px 5%', textAlign: 'center', marginTop: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>Payment Method</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,.8)', margin: '0 0 16px' }}>
          Review your booking summary and complete payment securely.
        </p>
        <div style={{ display: 'inline-flex', gap: 8 }}>
          {['1. Booking Review', '2. Select Payment Mode', '3. Pay Securely'].map((s, i) => (
            <div key={i} style={{ padding: '5px 16px', background: 'rgba(255,255,255,.18)',
              borderRadius: 20, fontSize: 12, fontWeight: 600, color: '#fff',
              border: '1px solid rgba(255,255,255,.3)' }}>{s}</div>
          ))}
        </div>
      </div>

      {/* TWO-COLUMN */}
      <div style={{ display: 'flex', gap: 22, padding: '26px 5%', maxWidth: 1280,
        margin: '0 auto', width: '100%', boxSizing: 'border-box', alignItems: 'flex-start' }}>

        {/* ── LEFT ── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Booking Summary */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f0e8e8',
            boxShadow: '0 2px 12px rgba(0,0,0,.05)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 22px', borderBottom: '1px solid #f0e8e8',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e', margin: 0 }}>Booking Summary</h2>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                background: `${O}12`, border: `1px solid ${O}44`, borderRadius: 20, padding: '3px 12px' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: O }}>
                  {isRound ? 'ROUND TRIP' : isMulti ? 'MULTI CITY' : 'ONE WAY'}{isIntl ? ' · INTERNATIONAL' : ''} · {paxDesc}
                </span>
              </div>
            </div>
            <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeSegments.map((seg, i) => <FlightSummaryCard key={i} seg={seg} index={i} isMulti={isMulti} />)}
            </div>
          </div>

          {/* Passenger Details — every traveller, not just the lead passenger */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f0e8e8',
            boxShadow: '0 2px 12px rgba(0,0,0,.05)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 22px', borderBottom: '1px solid #f0e8e8',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e', margin: 0 }}>Passenger Details</h2>
              <button onClick={() => window.history.back()} style={{ background: 'none',
                border: `1.5px solid ${O}55`, borderRadius: 7, padding: '5px 14px',
                fontSize: 12, fontWeight: 700, color: O, cursor: 'pointer', fontFamily: 'inherit' }}>
                ✎ Edit
              </button>
            </div>
            <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activePassengers.map((p, idx) => (
                <div key={idx} style={{ border: '1px solid #f0e8e8', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 16px', background: '#fafafa' }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%',
                      background: `${O}14`, border: `1.5px solid ${O}44`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 17, flexShrink: 0 }}>👤</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1a2e' }}>
                        {p.title}. {p.firstName} {p.lastName}
                      </div>
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                        {p.type}{idx === 0 ? ' · Lead Passenger' : ''}{isIntl && p.dob ? ` · DOB: ${p.dob}` : ''}
                      </div>
                    </div>
                  </div>

                  {isIntl && p.passport && (
                    <div style={{ padding: '12px 16px', borderTop: '1px dashed #f0e8e8', background: '#fff' }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: O,
                        letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>Passport Details</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: p.ffAirline ? 12 : 0 }}>
                        {[
                          { label: 'Nationality',     value: p.nationality },
                          { label: 'Passport No.',    value: p.passport },
                          { label: 'Issuing Country', value: p.issuingCountry },
                          { label: 'Issue',           value: p.passportIssue },
                          { label: 'Expiry',          value: p.passportExpiry },
                        ].map(f => (
                          <div key={f.label}>
                            <div style={{ fontSize: 9, color: '#bbb', fontWeight: 700,
                              textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>{f.label}</div>
                            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#1a1a2e' }}>{f.value}</div>
                          </div>
                        ))}
                      </div>
                      {p.ffAirline && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div>
                            <div style={{ fontSize: 9, color: '#bbb', fontWeight: 700,
                              textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>FF Airline</div>
                            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#1a1a2e' }}>{p.ffAirline}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 9, color: '#bbb', fontWeight: 700,
                              textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>FF Number</div>
                            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#1a1a2e' }}>{p.ffNumber}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contact Details */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f0e8e8',
            boxShadow: '0 2px 12px rgba(0,0,0,.05)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 22px', borderBottom: '1px solid #f0e8e8',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e', margin: 0 }}>Contact Details</h2>
              <button onClick={() => window.history.back()} style={{ background: 'none',
                border: `1.5px solid ${O}55`, borderRadius: 7, padding: '5px 14px',
                fontSize: 12, fontWeight: 700, color: O, cursor: 'pointer', fontFamily: 'inherit' }}>
                ✎ Edit
              </button>
            </div>
            <div style={{ padding: '14px 22px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { icon: '📱', label: 'Mobile', value: `${activeContact.countryCode} ${activeContact.mobile}` },
                  { icon: '✉️', label: 'Email',  value: activeContact.email },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', background: '#fafafa', border: '1px solid #f0e8e8',
                    borderRadius: 8 }}>
                    <span style={{ fontSize: 18 }}>{row.icon}</span>
                    <div>
                      <div style={{ fontSize: 10, color: '#bbb', textTransform: 'uppercase',
                        letterSpacing: '.06em', marginBottom: 2 }}>{row.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>{row.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Select Payment Mode */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f0e8e8',
            boxShadow: '0 2px 12px rgba(0,0,0,.05)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 22px', borderBottom: '1px solid #f0e8e8' }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e', margin: 0 }}>Select Payment Mode</h2>
            </div>
            <div style={{ padding: '16px 22px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 10 }}>
                {MODES.slice(0, 3).map(m => (
                  <button key={m.id} onClick={() => setSelectedMode(m.id)} style={{
                    padding: '16px 10px', background: selectedMode === m.id ? `${O}08` : '#fafafa',
                    border: selectedMode === m.id ? `2px solid ${O}` : '1.5px solid #e8e0e0',
                    borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 24, marginBottom: 7 }}>{m.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 800,
                      color: selectedMode === m.id ? O : '#1a1a2e' }}>{m.label}</div>
                    <div style={{ fontSize: 10.5, color: '#aaa', marginTop: 3 }}>{m.sub}</div>
                  </button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 16 }}>
                {MODES.slice(3).map(m => {
                  const disabled = m.id === 'creditpool' && creditpoolInsufficient;
                  return (
                    <button key={m.id} onClick={() => !disabled && setSelectedMode(m.id)} disabled={disabled} style={{
                      padding: '16px 10px',
                      background: disabled ? '#f5f5f5' : selectedMode === m.id ? `${O}08` : '#fafafa',
                      border: disabled ? '1.5px solid #eee' : selectedMode === m.id ? `2px solid ${O}` : '1.5px solid #e8e0e0',
                      borderRadius: 10, cursor: disabled ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit', textAlign: 'center', opacity: disabled ? 0.55 : 1,
                    }}>
                      <div style={{ fontSize: 24, marginBottom: 7 }}>{m.icon}</div>
                      <div style={{ fontSize: 13, fontWeight: 800,
                        color: disabled ? '#aaa' : selectedMode === m.id ? O : '#1a1a2e' }}>{m.label}</div>
                      <div style={{ fontSize: 10.5, color: disabled ? PK : '#aaa', marginTop: 3, fontWeight: disabled ? 700 : 400 }}>
                        {disabled ? 'Insufficient balance' : m.sub}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', background: '#fff9f0',
                border: `1px solid ${O}44`, borderRadius: 9 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>🔒</span>
                <div style={{ fontSize: 12.5, color: '#555', lineHeight: 1.5 }}>
                  {selectedMode === 'creditpool'
                    ? <>Clicking <strong style={{ color: O }}>Pay Now</strong> will deduct this amount from your Creditpool wallet balance.</>
                    : <>Clicking <strong style={{ color: O }}>Pay Now</strong> will open our secure payment gateway to complete the transaction. No card or UPI details are stored on this site.</>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT — Billing + Pay Now ── */}
        <div style={{ width: 292, flexShrink: 0, position: 'sticky', top: 82 }}>
          <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden',
            border: '1px solid #f0e8e8', boxShadow: '0 8px 32px rgba(240,120,32,.12)', marginBottom: 12 }}>

            <div style={{ background: `linear-gradient(135deg,${O} 0%,${O2} 100%)`, padding: '20px 22px' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,.75)',
                letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 10 }}>Price Summary</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
                {activeSegments.map((seg, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,.6)', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>{seg.from} → {seg.to}</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,.6)' }}>{seg.date}</span>
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

            <div style={{ padding: '0 22px 6px' }}>
              {activeSegments.map((s, i) => (
                <FareSummaryCard
                  key={i}
                  title={isRound ? (i === 0 ? 'Outbound Fare Summary' : 'Inbound Fare Summary')
                    : isMulti ? `${s.from} → ${s.to} Fare Summary` : 'Fare Summary'}
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

            {convenienceFee > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 22px', borderTop: '1px dashed #f0e8e2' }}>
                <span style={{ fontSize: 12, color: '#8a8378', fontWeight: 500 }}>
                  Convenience Fee ({MODES.find(m => m.id === selectedMode)?.label})
                </span>
                <span style={{ fontSize: 12.5, color: '#3a3530', fontWeight: 600 }}>
                  ₹ {convenienceFee.toLocaleString()}
                </span>
              </div>
            )}

            <div style={{ background: `linear-gradient(135deg,${O}12,${O}06)`,
              borderTop: `2px solid ${O}30`, padding: '16px 22px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: O,
                    letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 3 }}>Total Amount</div>
                  <div style={{ fontSize: 10.5, color: '#bbb' }}>Incl. all taxes &amp; fees</div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: O, letterSpacing: '-.01em' }}>
                  ₹ {finalTotalAmt.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Secure badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, marginBottom: 12 }}>
            <span style={{ fontSize: 15 }}>🔒</span>
            <span style={{ fontSize: 11, color: '#aaa', fontWeight: 500 }}>Secure &amp; Encrypted Payment</span>
          </div>

          {error && (
            <div style={{ fontSize: 12.5, color: PK, background: '#fdeef1', border: '1px solid #f3c6d0',
              borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
              {error}
            </div>
          )}

          {/* Pay Now */}
          <button onClick={handlePay} disabled={!canPay} style={{ width: '100%', padding: '14px 0',
            background: canPay ? `linear-gradient(135deg,${O},${O2})` : '#e8e2db',
            color: canPay ? '#fff' : '#bbb', border: 'none', borderRadius: 10,
            fontSize: 15, fontWeight: 800, cursor: canPay ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit', letterSpacing: '.02em',
            boxShadow: canPay ? `0 6px 20px ${O}55` : 'none', marginBottom: 10 }}>
            {payStatus === 'processing' ? 'Processing…' : `Pay Now ₹ ${finalTotalAmt.toLocaleString()}`}
          </button>

          <button onClick={() => window.history.back()}
            style={{ width: '100%', padding: '10px 0', background: 'none',
              border: '1.5px solid #e8e0e0', borderRadius: 10, fontSize: 13,
              fontWeight: 700, color: '#888', cursor: 'pointer', fontFamily: 'inherit' }}>
            ← Back to Review
          </button>
        </div>
      </div>

      <CorpFooter />

      <Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={() => setScriptReady(true)} />
    </div>
  );
}

export default function PaymentDetailsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#fdf6f2' }} />}>
      <PaymentContent />
    </Suspense>
  );
}
