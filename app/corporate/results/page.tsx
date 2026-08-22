'use client';
import React, { Suspense, useState, useEffect, useMemo, type CSSProperties, type Dispatch, type SetStateAction } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Inter, Playfair_Display } from 'next/font/google';
import BookingProgress from '../components/BookingProgress';
import { CityAutocomplete } from '../components/CityAutocomplete';
import FlightDetailsDrawer from '../components/FlightDetailsDrawer';
import CorpHeader from '../components/CorpHeader';

/* ── Indian airport/city detection (mirrors the dashboard search form) ── */
const INDIAN_KEYWORDS = new Set([
  'del','bom','blr','maa','hyd','ccu','cok','ixc','amd','pnq','goi','vns','jai','lko','pat',
  'ixb','bbi','ixr','ixg','ixl','ixa','ixs','ixu','ixw','ixz','vtz','cjb','trv','idr',
  'sxr','ixm','atq','bho','nag','jlr','gau','dib','tez','jrh','moz','hbx','bdq','raj',
  'delhi','mumbai','bangalore','bengaluru','chennai','hyderabad','kolkata','kochi','cochin',
  'chandigarh','ahmedabad','pune','goa','varanasi','jaipur','lucknow','patna','bhubaneswar',
  'ranchi','hubli','jammu','leh','agartala','silchar','dibrugarh','jorhat','imphal','indore',
  'surat','nagpur','jabalpur','guwahati','amritsar','bhopal','visakhapatnam','vizag','coimbatore',
  'thiruvananthapuram','trivandrum','mangalore','tirupati','vadodara','rajkot','raipur',
  'india','ind',
]);
function isIndian(city: string): boolean {
  const lower = city.toLowerCase();
  for (const kw of INDIAN_KEYWORDS) if (lower.includes(kw)) return true;
  return false;
}
function getResultsBasePath(from: string, to: string): string {
  return isIndian(from) && isIndian(to) ? '/corporate/results' : '/corporate/results/international';
}
function ddmmyyyyToIso(s: string): string {
  const [d, m, y] = s.split('/');
  return d && m && y ? `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}` : '';
}
function isoToDdmmyyyy(s: string): string {
  const [y, m, d] = s.split('-');
  return y && m && d ? `${d}/${m}/${y}` : '';
}

/* Encode a selected flight into `${prefix}_*` query params for the next step (passenger-details).
 * NOTE: price/fareId here are for display only — the booking/payment step must re-validate the
 * fare against `yatraId` server-side rather than trust these client-supplied values, since a URL
 * param is trivially editable by the user. */
/* fromFull/toFull carry the exact "City, Country (CODE)" label the search form sent (e.g.
 * "Jaipur, India (JAI)") and fromCountry/toCountry the 2-letter country code (e.g. "IN") — both
 * straight from the URL, forwarded through to booking_root.origin_city/destination_city and
 * .origin_country/destination_country respectively. */
function appendFlightParams(
  params: URLSearchParams, prefix: string, flight: Flight, date: string,
  fromFull: string, toFull: string, fromCountry: string, toCountry: string,
) {
  params.set(`${prefix}_from`, flight.from);
  params.set(`${prefix}_to`, flight.to);
  params.set(`${prefix}_fromFull`, fromFull);
  params.set(`${prefix}_toFull`, toFull);
  params.set(`${prefix}_fromCountry`, fromCountry);
  params.set(`${prefix}_toCountry`, toCountry);
  params.set(`${prefix}_date`, date);
  params.set(`${prefix}_dep`, flight.dep);
  params.set(`${prefix}_arr`, flight.arr);
  params.set(`${prefix}_dur`, flight.dur);
  params.set(`${prefix}_stops`, flight.stopsLabel);
  params.set(`${prefix}_airline`, flight.airline);
  params.set(`${prefix}_airCode`, flight.airCode);
  params.set(`${prefix}_flightCode`, flight.segments.map(s => s.code).join('+'));
  params.set(`${prefix}_price`, String(flight.price));
  params.set(`${prefix}_fareId`, flight.fareId);
  params.set(`${prefix}_refundable`, String(flight.refundable));
  params.set(`${prefix}_yatraId`, flight.yatraId);
  params.set(`${prefix}_flight_id`, base64Encode(flight.yatraId));
  params.set(`${prefix}_data`, base64Encode(flight));
  params.set(`${prefix}_scid`, flight.scid);
  params.set(`${prefix}_supplierCode`, flight.supplierCode);
}

/* Browser-safe UTF-8 base64 encode — mirrors PHP's base64_encode(json_encode($x)) from the
 * Laravel reference (route('flights_detail', ['flight_id'=>base64_encode(...), 'data'=>...])). */
function base64Encode(value: unknown): string {
  const json = JSON.stringify(value);
  return btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g,
    (_, hex: string) => String.fromCharCode(parseInt(hex, 16))));
}

function extractAirportCode(cityLabel: string): string {
  return cityLabel.match(/\(([^)]+)\)/)?.[1] ?? '';
}

/* Mirrors Laravel's $requestd_data — the exact array shape flights_list() builds and hands to
 * searchFlights() for the live Yatra API call — so the same "data for the live API" can be
 * base64-encoded and carried forward past the results page (Laravel's `encodeDataForApi` route
 * param), instead of only living in the browser's current-page URL. */
function buildEncodeDataForApi(sp: URLSearchParams): Record<string, unknown> {
  const type = sp.get('type') ?? '';
  const fromCities = sp.getAll('from_city[]');
  const toCities = sp.getAll('to_city[]');
  const originCountry = sp.getAll('origin_country[]');
  const destinationCountry = sp.getAll('destination_country[]');
  const departures = sp.getAll('departure[]');
  const isDomestic = originCountry.includes('IN') && destinationCountry.includes('IN');

  const data: Record<string, unknown> = {
    type,
    viewName: 'normal',
    flexi: sp.get('fare_type') || '1',
    noOfSegments: sp.get('no_segments') ?? '',
    originCountry,
    origin: fromCities.map(extractAirportCode),
    destinationCountry,
    destination: toCities.map(extractAirportCode),
    flight_depart_date: departures,
    travelers: sp.getAll('travelers[]'),
    ADT: sp.get('adults') ?? '',
    CHD: sp.get('childs') ?? '',
    INF: sp.get('infants') ?? '',
    class: sp.get('class') ?? '',
    hb: 1,
    origin_city: fromCities,
    destination_city: toCities,
    flight_type: isDomestic ? 'Domestic' : 'International',
  };
  if (type === 'R') data.arrivalDate = departures[1] ?? '';
  if (type !== 'M') { data.source = 'fresco-home'; data['booking-type'] = 'official'; }
  return data;
}

const inter    = Inter({ subsets:['latin'], weight:['400','500','600','700','800'] });
const playfair = Playfair_Display({ subsets:['latin'], weight:['700'], style:['italic'] });

const O  = '#f07820';
const O2 = '#e86d18';
const PK = '#c9184a';

/* ─── Types ─── */
type StopFilter = 0 | 1 | 2;
type TimeSlot   = '00-06' | '06-12' | '12-18' | '18-00';
type SortKey    = 'depart' | 'arrive' | 'duration' | 'price';

function getLayoverCity(f: { segments: { to: string }[]; stops: number }): string | null {
  if (f.stops === 0 || f.segments.length < 2) return null;
  const raw = f.segments[0].to; // e.g. "Mumbai (T-2)"
  return raw.replace(/\s*\(.*?\)$/, '').trim();
}
// Strips the trailing airport code out of a "City (CODE)" label — e.g. "Jaipur (JAI)" → "Jaipur".
function cityOnly(full: string): string {
  return full.replace(/\s*\(.*?\)$/, '').trim();
}

type Segment = { airline: string; code: string; color: string; dep: string; arr: string; from: string; to: string; dur: string; layover?: string };
type FareOption = {
  fareId: string; price: number; cabinBag: string; checkIn: string; meal: string;
  refundable: boolean; yatraId: string;
};
type Flight  = {
  id: number; yatraId: string; airline: string; airCode: string; color: string;
  dep: string; arr: string; from: string; to: string;
  dur: string; durMin: number; stops: number; stopsLabel: string; price: number;
  fareId: string; refundable: boolean; fareOptions: FareOption[];
  segments: Segment[];
  /** Yatra's supplier/vendor code and search-session id — needed alongside yatraId for the
   * live pricing re-check call (/api/flights/price) on review-booking. */
  supplierCode: string; scid: string;
};


function inTimeSlot(dep: string, slot: TimeSlot) {
  const h = parseInt(dep.split(':')[0]) % 24;
  if (slot === '00-06') return h >= 0  && h < 6;
  if (slot === '06-12') return h >= 6  && h < 12;
  if (slot === '12-18') return h >= 12 && h < 18;
  if (slot === '18-00') return h >= 18;
  return true;
}

/* ─── Airline Logo ─── */
function AirlineLogo({ code, color, size = 38, radius = 10 }: { code: string; color: string; size?: number; radius?: number }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div style={{ width:size, height:size, borderRadius:radius, background: color,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize: size * 0.32, fontWeight:800, color:'#fff', letterSpacing:'.04em', flexShrink:0 }}>{code}</div>
    );
  }

  return (
    <img
      src={`/airline_icons/${code}.png`}
      alt={code}
      onError={() => setFailed(true)}
      style={{ width:size, height:size, borderRadius:radius, objectFit:'contain',
        background:'#fff', border:'1px solid #f0ecea', flexShrink:0 }}
    />
  );
}

/* ─── Flight Card ─── */
function FlightCard({
  flight, selected, onSelect, onBook, trip, legRoutes,
}: {
  flight: Flight; selected: boolean; onSelect: (f: Flight) => void; onBook: (f: Flight) => void;
  trip: 'one-way' | 'round' | 'multi'; legRoutes: { from: string; to: string }[];
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [fareOpen,    setFareOpen]    = useState(false);
  const [rulesOpen,   setRulesOpen]   = useState(false);

  const cheapestFare = [...flight.fareOptions].sort((a, b) => a.price - b.price)[0];

  return (
    <div style={{ background:'#fff', borderRadius:10, border:`1.5px solid ${selected ? O : '#ede8e8'}`,
      boxShadow: selected ? `0 0 0 2px ${O}44` : '0 2px 8px rgba(0,0,0,.04)',
      overflow:'hidden', marginBottom:10, transition:'border-color .15s' }}>

      {/* Main row */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px' }}>

        {/* Airline */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5,
          minWidth:72, flexShrink:0 }}>
          <AirlineLogo code={flight.airCode} color={flight.color} size={52} />
          <div style={{ fontSize:10.5, fontWeight:600, color:'#555', textAlign:'center',
            lineHeight:1.3 }}>{flight.airline}</div>
          <div style={{ fontSize:9.5, color:'#aaa' }}>{flight.segments.map(s=>s.code).join(' · ')}</div>
        </div>

        {/* Times */}
        <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          {/* Header row */}
          {(['DEPART','DURATION','ARRIVAL'] as const).map(h => (
            <div key={h} style={{ fontSize:9, fontWeight:800, color:'#bbb',
              letterSpacing:'.1em', textAlign:'center' }}>{h}</div>
          ))}
          {/* Values */}
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:17, fontWeight:800, color:'#1a1a2e' }}>{flight.dep}</div>
            <div style={{ fontSize:11, color:'#888', marginTop:3 }}>{flight.from}</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:14, fontWeight:700, color:'#555' }}>{flight.dur}</div>
            <div style={{ fontSize:11, color:'#aaa', marginTop:3 }}>{flight.stopsLabel}</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:17, fontWeight:800, color:'#1a1a2e' }}>{flight.arr}</div>
            <div style={{ fontSize:11, color:'#888', marginTop:3 }}>{flight.to}</div>
          </div>
        </div>

        {/* Price + CTA */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8,
          flexShrink:0, minWidth:130 }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:9, color:'#bbb', letterSpacing:'.06em' }}>PRICE</div>
            <div style={{ fontSize:18, fontWeight:800, color: O }}>
              ₹ {flight.price.toLocaleString()}.0
            </div>
            <div style={{ fontSize:9.5, color:'#bbb' }}>per adult</div>
          </div>
          {flight.fareOptions.length > 1 ? (
            <button onClick={() => setFareOpen(p => !p)} style={{
              padding:'8px 16px', background:`linear-gradient(135deg,${O},${O2})`,
              color:'#fff', border:'none', borderRadius:20,
              fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
              boxShadow:`0 3px 10px ${O}44`,
              display:'flex', alignItems:'center', gap:5,
            }}>
              Select Fare <span style={{ fontSize:10, display:'inline-block',
                transform: fareOpen ? 'rotate(180deg)' : 'none',
                transition:'transform .2s' }}>▼</span>
            </button>
          ) : (
            <button onClick={() => { onSelect(flight); if (trip === 'one-way') onBook(flight); }} style={{
              padding:'8px 16px', background:`linear-gradient(135deg,${O},${O2})`,
              color:'#fff', border:'none', borderRadius:20,
              fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
              boxShadow:`0 3px 10px ${O}44`,
            }}>
              {trip === 'one-way' ? 'Book Now' : 'Select'}
            </button>
          )}
        </div>
      </div>

      {/* Fare metadata */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 18px',
        borderTop:'1px solid #f5f0ee', background:'#fafafa' }}>
        <span style={{ fontSize:11, fontWeight:700, color:'#888' }}>{flight.fareId}</span>
        <span style={{ fontSize:11, fontWeight:600, color: flight.refundable ? '#2d8a4e' : PK }}>
          {flight.refundable ? 'Refundable' : 'Non-Refundable'}
        </span>
      </div>

      {/* Flight Details / Fare Rules toggle bar */}
      <div style={{ borderTop:'1px solid #f5f0ee' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          background:'#fafafa', padding:'7px 18px' }}>
          <button onClick={() => setDetailsOpen(p => !p)} style={{
            background:'none', border:'none', cursor:'pointer', fontFamily:'inherit',
            display:'flex', alignItems:'center', gap:6, padding:0,
          }}>
            <span style={{ fontSize:11.5, fontWeight:700, color: O }}>Flight Details</span>
            <span style={{ fontSize:11, color:'#bbb', transform: detailsOpen ? 'rotate(180deg)' : 'none',
              display:'inline-block', transition:'transform .2s' }}>▾</span>
          </button>
          <button onClick={() => setRulesOpen(true)} style={{
            background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', padding:0,
            fontSize:11.5, fontWeight:700, color: PK,
            display:'flex', alignItems:'center', gap:4 }}>
            Fare Rules
            <span style={{ fontSize:10 }}>↗</span>
          </button>
        </div>

        {detailsOpen && (
          <div style={{ background:'#fafaf8', padding:'12px 18px 14px', borderTop:'1px solid #f0e8e8' }}>
            {flight.segments.map((seg, i) => (
              <div key={i}>
                {seg.layover && (
                  <div style={{ fontSize:11.5, color:'#f07820', fontWeight:600,
                    background:'#fff8f0', border:'1px dashed #f0d0a0',
                    borderRadius:6, padding:'5px 12px', margin:'8px 0', textAlign:'center' }}>
                    🕐 {seg.layover}
                  </div>
                )}
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0' }}>
                  <AirlineLogo code={flight.airCode} color={seg.color} size={28} radius={7} />
                  <div style={{ fontSize:12.5, color:'#555' }}>
                    <b style={{ color:'#1a1a2e' }}>{seg.code}</b> &nbsp;·&nbsp;
                    {seg.dep} <span style={{ color:'#bbb' }}>→</span> {seg.arr} &nbsp;·&nbsp; {seg.dur} &nbsp;·&nbsp;
                    <span style={{ color:'#888' }}>{seg.from} → {seg.to}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fare table — shown when "Select Fare" is clicked and there's more than one fare bundle */}
      {fareOpen && flight.fareOptions.length > 1 && (
        <div style={{ borderTop:'1px solid #f0e8e8', overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:'#fdf5f0' }}>
                {['FARE','CABIN BAG','CHECK-IN','MEAL','CANCELLATION','PRICE'].map(h => (
                  <th key={h} style={{ padding:'8px 14px', textAlign:'left', fontSize:9.5,
                    fontWeight:800, color:'#aaa', letterSpacing:'.08em', whiteSpace:'nowrap',
                    borderBottom:'1px solid #f0e8e8' }}>{h}</th>
                ))}
                <th style={{ borderBottom:'1px solid #f0e8e8' }} />
              </tr>
            </thead>
            <tbody>
              {flight.fareOptions.map((row, i) => (
                <tr key={row.yatraId} style={{ background: i % 2 === 0 ? '#fff' : '#fdf9f7',
                  borderBottom:'1px solid #f5f0ee' }}>
                  <td style={{ padding:'10px 14px', fontWeight:700, color:'#1a1a2e' }}>{row.fareId}</td>
                  <td style={{ padding:'10px 14px', color:'#555' }}>{row.cabinBag} / Adult</td>
                  <td style={{ padding:'10px 14px', color:'#555' }}>{row.checkIn} / Adult</td>
                  <td style={{ padding:'10px 14px', color:'#555' }}>{row.meal}</td>
                  <td style={{ padding:'10px 14px', color: row.refundable ? '#2d8a4e' : PK,
                    fontWeight:600 }}>{row.refundable ? 'Refundable' : 'Non-Refundable'}</td>
                  <td style={{ padding:'10px 14px', fontWeight:800, color: O }}>
                    ₹ {row.price.toLocaleString()}.0
                  </td>
                  <td style={{ padding:'10px 14px' }}>
                    <button onClick={() => {
                      const picked: Flight = { ...flight, price: row.price, fareId: row.fareId, refundable: row.refundable, yatraId: row.yatraId };
                      onSelect(picked);
                      if (trip === 'one-way') onBook(picked);
                    }} style={{
                      padding:'6px 14px', background:`linear-gradient(135deg,${O},${O2})`,
                      color:'#fff', border:'none', borderRadius:14,
                      fontSize:11.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                      whiteSpace:'nowrap',
                    }}>{trip === 'one-way' ? 'Book Now' : 'Select'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rulesOpen && (
        <FlightDetailsDrawer
          onClose={() => setRulesOpen(false)}
          routeLabel={`${flight.from.replace(/\s*\(.*?\)$/, '')} → ${flight.to.replace(/\s*\(.*?\)$/, '')}`}
          fareRows={[
            { label: cheapestFare.fareId, sub: 'Adult (1 × fare)', value: `₹ ${cheapestFare.price.toLocaleString()}.0` },
            { label: 'Total Amount', value: `₹ ${cheapestFare.price.toLocaleString()}.0`, bold: true },
          ]}
          fareRules={DOMESTIC_FARE_RULES}
          baggageLegs={
            legRoutes.length > 1
              ? legRoutes.map((r, i) => ({
                  routeLabel: `${cityOnly(r.from) || cityOnly(flight.from)} → ${cityOnly(r.to) || cityOnly(flight.to)}`,
                  directionLabel: trip === 'round' ? (i === 0 ? 'DEPART' : 'RETURN') : `LEG ${i + 1}`,
                  checkIn: cheapestFare.checkIn,
                  cabin: cheapestFare.cabinBag,
                }))
              : [{
                  routeLabel: `${cityOnly(flight.from)} → ${cityOnly(flight.to)}`,
                  checkIn: cheapestFare.checkIn,
                  cabin: cheapestFare.cabinBag,
                }]
          }
          extraBaggageRows={[
            { label: 'Meal', value: cheapestFare.meal || '-' },
            { label: 'Fare Type', value: cheapestFare.refundable ? 'Refundable' : 'Non-Refundable' },
          ]}
        />
      )}
    </div>
  );
}

const DOMESTIC_FARE_RULES = [
  'Any changes including cancellation, rescheduling, or itinerary modification must be made at least 5 hours before departure.',
  'GST and RAF charges will be applicable on the cancellation penalty.',
  'The above data is indicative — fare rules are subject to change by the airline from time to time depending on fare class, and change/cancellation fee amount may also vary based on fluctuations in currency conversion rates.',
  'Cancellation/Reissue fees will follow the more restrictive fare type.',
  'Feel free to call our Contact Centre for exact cancellation/change fee.',
  'No refund for no-show cases unless the airline permits it.',
];

/* ─── Read the incoming search from the URL (sent by the dashboard search form) ─── */
function parseInitialSearch(sp: { get(key: string): string | null; getAll(key: string): string[] }) {
  const fallback = {
    trip: 'round' as 'one-way'|'round'|'multi',
    from: 'Jaipur, India (JAI)',
    to: 'New Delhi, India (DEL)',
    depDate: '30/07/2026',
    retDate: '31/07/2026',
    adults: 1,
    children: 0,
    infants: 0,
    cabinClass: 'Economy',
  };

  const typeParam = sp.get('type');
  const trip: 'one-way'|'round'|'multi' =
    typeParam === 'O' ? 'one-way' :
    typeParam === 'M' ? 'multi' :
    typeParam === 'R' ? 'round' :
    (sp.get('trip') === 'one-way' ? 'one-way' : 'round');

  const fromCities    = sp.getAll('from_city[]');
  const toCities      = sp.getAll('to_city[]');
  const departures    = sp.getAll('departure[]');
  const originCodes   = sp.getAll('origin_country[]');
  const destCodes     = sp.getAll('destination_country[]');

  const parseCount = (raw: string | null, fallbackN: number) => {
    const n = parseInt((raw ?? '').trim(), 10);
    return Number.isFinite(n) ? n : fallbackN;
  };

  return {
    trip,
    from: fromCities[0] || fallback.from,
    to:   toCities[0]   || fallback.to,
    fromCountry: originCodes[0] || '',
    toCountry:   destCodes[0]   || '',
    depDate: departures[0] || fallback.depDate,
    retDate: departures[1] || fallback.retDate,
    adults:   parseCount(sp.get('adults'),   fallback.adults),
    children: parseCount(sp.get('childs'),   fallback.children),
    infants:  parseCount(sp.get('infants'),  fallback.infants),
    cabinClass: sp.get('class')?.trim() || fallback.cabinClass,
  };
}

/* ─── Main Page ─── */
export default function ResultsPage() {
  return (
    <Suspense fallback={null}>
      <ResultsPageInner />
    </Suspense>
  );
}

function ResultsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = useMemo(() => parseInitialSearch(searchParams), [searchParams]);
  const [trip, setTrip] = useState<'one-way'|'round'|'multi'>(initialSearch.trip);
  const [from,        setFrom]        = useState(initialSearch.from);
  const [to,          setTo]          = useState(initialSearch.to);
  const [fromCountry, setFromCountry] = useState(initialSearch.fromCountry);
  const [toCountry,   setToCountry]   = useState(initialSearch.toCountry);
  const [depDate,     setDepDate]     = useState(initialSearch.depDate);
  const [retDate,     setRetDate]     = useState(initialSearch.retDate);
  const [showSearchErrors, setShowSearchErrors] = useState(false);

  const [sortBy,      setSortBy]      = useState<SortKey>('price');
  // ?direct=1 (from the dashboard's Direct Flights Only toggle) pre-selects the 0-stops filter
  // below rather than being its own separate filter — Stops already covers "direct".
  const [filterStops,   setFilterStops]   = useState<StopFilter[]>(() => searchParams.get('direct') === '1' ? [0] : []);
  const [filterTime,    setFilterTime]    = useState<TimeSlot[]>([]);
  const [filterAir,     setFilterAir]     = useState<string[]>([]);
  const [filterLayover, setFilterLayover] = useState<string[]>([]);
  const [priceMax,      setPriceMax]      = useState(0);

  /* ── Live flight search ── */
  const [legs, setLegs] = useState<{ routeKey: string; flights: Flight[] }[]>([]);
  const [loadingFlights, setLoadingFlights] = useState(true);
  const [searchMsg, setSearchMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoadingFlights(true);
    setSearchMsg('');
    fetch(`/api/flights/search?${searchParams.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        setLegs(data.legs ?? []);
        if (data.status === false) setSearchMsg(data.msg || 'No flights found for this search.');
      })
      .catch(() => {
        if (cancelled) return;
        setLegs([]);
        setSearchMsg('Something went wrong while searching flights. Please try again.');
      })
      .finally(() => { if (!cancelled) setLoadingFlights(false); });
    return () => { cancelled = true; };
  }, [searchParams]);

  const outboundFlights = legs[0]?.flights ?? [];

  /* Which leg the visible list below reflects — index into `legs` (0..n-1). Works for round
   * trip (2 legs) and multi-city (N legs) alike; for one-way there's only ever leg 0. */
  const [activeLeg, setActiveLeg] = useState<number>(0);
  useEffect(() => { setActiveLeg(0); }, [legs]);
  const activeFlights = legs[activeLeg]?.flights ?? outboundFlights;

  const computedMinPrice = activeFlights.length ? Math.min(...activeFlights.map(f => f.price)) : 0;
  const computedMaxPrice = activeFlights.length ? Math.max(...activeFlights.map(f => f.price)) : 0;
  useEffect(() => { setPriceMax(computedMaxPrice); }, [computedMaxPrice]);

  const layoverCities = useMemo(() => [...new Set(
    activeFlights.map(f => getLayoverCity(f)).filter((c): c is string => c !== null)
  )], [activeFlights]);

  const airlineList = useMemo(() => {
    const seen = new Map<string, { code:string; name:string; color:string }>();
    for (const f of activeFlights) {
      if (!seen.has(f.airCode)) seen.set(f.airCode, { code:f.airCode, name:`${f.airline} (${f.airCode})`, color:f.color });
    }
    return [...seen.values()];
  }, [activeFlights]);

  /* Selected flight per leg (leg index -> Flight|null). Initialized to each leg's cheapest flight. */
  const [selectedLegs, setSelectedLegs] = useState<Record<number, Flight | null>>({});
  useEffect(() => {
    const init: Record<number, Flight | null> = {};
    for (let i = 0; i < legs.length; i++) {
      const flights = legs[i]?.flights ?? [];
      init[i] = ([...flights].sort((a, b) => a.price - b.price)[0] ?? null);
    }
    setSelectedLegs(init);
  }, [legs]);


  /* Trip type picker */
  const [tripTypeOpen, setTripTypeOpen] = useState(false);
  const TRIP_TYPES = [
    { val: 'one-way' as const, label: 'One Way',    icon: '➜' },
    { val: 'round'   as const, label: 'Round Trip', icon: '⇄' },
    { val: 'multi'   as const, label: 'Multi City',  icon: '⋯' },
  ];

  /* Passenger & class picker */
  const [paxOpen,    setPaxOpen]    = useState(false);
  const [adults,     setAdults]     = useState(initialSearch.adults);
  const [children,   setChildren]   = useState(initialSearch.children);
  const [infants,    setInfants]    = useState(initialSearch.infants);
  const [cabinClass, setCabinClass] = useState(initialSearch.cabinClass);
  const totalPax = adults + children + infants;
  const paxLabel = `${totalPax} Traveller${totalPax !== 1 ? 's' : ''}, ${cabinClass}`;
  const CABINS   = ['Economy','Business','First Class','Premium Economy'];

  const totalFare = Object.values(selectedLegs).reduce((s, f) => s + (f?.price ?? 0), 0);

  /* Per-leg display data straight from the URL — works whether this page was reached via a
   * round-trip search (2 legs) or a multi-city search built elsewhere (N legs). */
  const departuresList  = useMemo(() => searchParams.getAll('departure[]'), [searchParams]);
  const fromCitiesList  = useMemo(() => searchParams.getAll('from_city[]'), [searchParams]);
  const toCitiesList    = useMemo(() => searchParams.getAll('to_city[]'), [searchParams]);
  const originCodesList = useMemo(() => searchParams.getAll('origin_country[]'), [searchParams]);
  const destCodesList   = useMemo(() => searchParams.getAll('destination_country[]'), [searchParams]);

  // One entry per leg of the searched trip — 1 for one-way, 2 for round trip, N for multi-city.
  // Feeds the Baggage & Inclusions tiles in the Fare Rules popup, one tile per leg.
  const legRoutes = useMemo(
    () => fromCitiesList.map((from, i) => ({ from, to: toCitiesList[i] ?? '' })),
    [fromCitiesList, toCitiesList]
  );

  function appendLegParams(params: URLSearchParams, index: number, flight: Flight, date: string) {
    const prefix = `leg${index}`;
    params.set(`${prefix}_from`, flight.from);
    params.set(`${prefix}_to`, flight.to);
    params.set(`${prefix}_fromFull`, fromCitiesList[index] || flight.from);
    params.set(`${prefix}_toFull`, toCitiesList[index] || flight.to);
    params.set(`${prefix}_fromCountry`, originCodesList[index] || '');
    params.set(`${prefix}_toCountry`, destCodesList[index] || '');
    params.set(`${prefix}_date`, date);
    params.set(`${prefix}_dep`, flight.dep);
    params.set(`${prefix}_arr`, flight.arr);
    params.set(`${prefix}_dur`, flight.dur);
    params.set(`${prefix}_stops`, flight.stopsLabel);
    params.set(`${prefix}_airline`, flight.airline);
    params.set(`${prefix}_airCode`, flight.airCode);
    params.set(`${prefix}_flightCode`, flight.segments.map(s => s.code).join('+'));
    params.set(`${prefix}_price`, String(flight.price));
    params.set(`${prefix}_fareId`, flight.fareId);
    params.set(`${prefix}_refundable`, String(flight.refundable));
    params.set(`${prefix}_yatraId`, flight.yatraId);
    params.set(`${prefix}_flight_id`, base64Encode(flight.yatraId));
    params.set(`${prefix}_data`, base64Encode(flight));
    params.set(`${prefix}_scid`, flight.scid);
    params.set(`${prefix}_supplierCode`, flight.supplierCode);
  }

  function toggleArr<T>(set: Dispatch<SetStateAction<T[]>>, val: T) {
    set(p => p.includes(val) ? p.filter(x => x !== val) : [...p, val]);
  }

  function swapCities() {
    const t = from; setFrom(to); setTo(t);
    const tc = fromCountry; setFromCountry(toCountry); setToCountry(tc);
  }

  function handleSearch() {
    const valid = Boolean(from.trim() && to.trim() && depDate.trim() && (trip !== 'round' || retDate.trim()));
    if (!valid) { setShowSearchErrors(true); return; }
    setShowSearchErrors(false);

    const params = new URLSearchParams();
    const typeMap: Record<'one-way'|'round'|'multi', string> = { 'one-way':'O', round:'R', multi:'M' };
    params.set('type', typeMap[trip]);

    const fromCities    = trip === 'round' ? [from, to] : [from];
    const fromCountries = trip === 'round' ? [fromCountry, toCountry] : [fromCountry];
    const toCities       = trip === 'round' ? [to, from] : [to];
    const toCountries    = trip === 'round' ? [toCountry, fromCountry] : [toCountry];
    const departures      = trip === 'round' ? [depDate, retDate] : [depDate];

    params.set('no_segments', String(fromCities.length));
    fromCities.forEach(c => params.append('from_city[]', c));
    fromCountries.forEach(c => params.append('origin_country[]', c));
    toCities.forEach(c => params.append('to_city[]', c));
    toCountries.forEach(c => params.append('destination_country[]', c));
    departures.forEach(d => params.append('departure[]', d));

    params.append('travelers[]', ` ${totalPax} Traveler(s),${cabinClass} `);
    params.set('adults', ` ${adults} `);
    params.set('childs', ` ${children} `);
    params.set('infants', ` ${infants} `);
    params.set('class', cabinClass);
    params.set('fare_type', '1');

    router.push(`${getResultsBasePath(from, to)}?${params.toString()}`);
  }

  const filtered = useMemo(() => activeFlights.filter(f => {
    if (filterStops.length && !filterStops.includes(f.stops as StopFilter)) return false;
    if (filterTime.length  && !filterTime.some(s => inTimeSlot(f.dep, s))) return false;
    if (filterAir.length   && !filterAir.includes(f.airCode)) return false;
    if (filterLayover.length) {
      const city = getLayoverCity(f);
      if (!city || !filterLayover.includes(city)) return false;
    }
    if (f.price > priceMax) return false;
    return true;
  }), [activeFlights, filterStops, filterTime, filterAir, filterLayover, priceMax]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    if (sortBy === 'price')    return a.price - b.price;
    if (sortBy === 'depart')   return a.dep.localeCompare(b.dep);
    if (sortBy === 'arrive')   return a.arr.localeCompare(b.arr);
    if (sortBy === 'duration') return a.durMin - b.durMin;
    return 0;
  }), [filtered, sortBy]);

  const CB: CSSProperties = { width:13, height:13, accentColor: O, cursor:'pointer', flexShrink:0 };

  return (
    <div className={inter.className} style={{ background:'#f9f2ec', minHeight:'100vh', color:'#1a1a2e' }}>

      {/* ── FULL-SCREEN SEARCH LOADER ── */}
      {loadingFlights && (
        <div style={{
          position:'fixed', inset:0, zIndex:9999,
          background:'rgba(253,248,243,0.88)', backdropFilter:'blur(2px)',
          display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center', gap:18,
        }}>
          <div style={{ fontSize:52 }}>✈️</div>
          <div style={{
            width:38, height:38, borderRadius:'50%',
            border:`3px solid ${O}33`, borderTopColor:O,
            animation:'spin .8s linear infinite',
          }} />
          <div style={{ fontSize:16, fontWeight:700, color:'#888' }}>Searching flights…</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* ── NAV ── */}
      <CorpHeader />

      {/* ── PROGRESS ── */}
      <BookingProgress step={2} />

      {/* ── COMPACT SEARCH BAR ── */}
      <div style={{ background:'#fdf8f3', borderBottom:`1.5px solid ${O}22`,
        padding:'10px 5%', boxShadow:'0 3px 14px rgba(240,120,32,.08)',
        position:'sticky', top:58, zIndex:150 }}>
        <div style={{ maxWidth:1240, margin:'0 auto',
          display:'flex', alignItems:'center', gap:8 }}>

          {([
            { label:'TRIP TYPE', content:(
              <div style={{ position:'relative' }}>
                {/* Trigger */}
                <button onClick={() => setTripTypeOpen(p => !p)} style={{
                  background:'transparent', border:'none', outline:'none', padding:0,
                  color:'#1a1a2e', fontWeight:700, fontSize:13, fontFamily:'inherit',
                  cursor:'pointer', textAlign:'left', width:'100%',
                  display:'flex', alignItems:'center', gap:6,
                }}>
                  <span style={{ flex:1 }}>{TRIP_TYPES.find(t => t.val === trip)?.label}</span>
                  <span style={{ fontSize:9, color: O, flexShrink:0,
                    transform: tripTypeOpen ? 'rotate(180deg)' : 'none', transition:'transform .15s' }}>▼</span>
                </button>

                {/* Dropdown panel */}
                {tripTypeOpen && (
                  <div style={{
                    position:'absolute', top:'calc(100% + 14px)', left:0, zIndex:500,
                    background:'#fff', borderRadius:14, minWidth:180,
                    boxShadow:'0 12px 48px rgba(0,0,0,.15), 0 2px 8px rgba(0,0,0,.06)',
                    border:'1px solid #f0e8e8', padding:8,
                  }}>
                    {TRIP_TYPES.map(t => {
                      const active = trip === t.val;
                      return (
                        <div key={t.val} onClick={() => { setTrip(t.val); setTripTypeOpen(false); }} style={{
                          display:'flex', alignItems:'center', gap:10, cursor:'pointer',
                          padding:'10px 12px', borderRadius:9,
                          background: active ? `${O}12` : 'transparent',
                        }}>
                          <span style={{ fontSize:14, width:20, textAlign:'center', color: active ? O : '#999' }}>{t.icon}</span>
                          <span style={{ flex:1, fontSize:13.5, fontWeight: active ? 700 : 500,
                            color: active ? O : '#1a1a2e' }}>{t.label}</span>
                          <div style={{ width:16, height:16, borderRadius:'50%', flexShrink:0,
                            border:`2px solid ${active ? O : '#d0d0d0'}`,
                            display:'flex', alignItems:'center', justifyContent:'center' }}>
                            {active && <div style={{ width:6, height:6, borderRadius:'50%', background: O }} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ), flex:0.9 },
            { label:'FROM CITY', content:(
              <CityAutocomplete value={from}
                onChange={(v, opt) => { setFrom(v); setFromCountry(opt?.countryCode ?? ''); }}
                inputStyle={{ color:'#1a1a2e', fontWeight:700, fontSize:13, fontFamily:'inherit' }}
                inputClassName="focus-ring-off" />
            ), flex:1.6, swap: true, error: showSearchErrors && !from.trim() },
            { label:'TO CITY', content:(
              <CityAutocomplete value={to}
                onChange={(v, opt) => { setTo(v); setToCountry(opt?.countryCode ?? ''); }}
                inputStyle={{ color:'#1a1a2e', fontWeight:700, fontSize:13, fontFamily:'inherit' }}
                inputClassName="focus-ring-off" />
            ), flex:1.6, error: showSearchErrors && !to.trim() },
            { label:'DEPART', content:(
              <input className="focus-ring-off" type="date" value={ddmmyyyyToIso(depDate)} min={new Date().toISOString().slice(0,10)}
                onChange={e => setDepDate(isoToDdmmyyyy(e.target.value))} style={{
                background:'transparent', border:'none', outline:'none',
                color:'#1a1a2e', fontWeight:700, fontSize:13, fontFamily:'inherit', width:'100%' }} />
            ), flex:1.1, error: showSearchErrors && !depDate.trim() },
            ...(trip === 'round' ? [{ label:'RETURN', content:(
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <input className="focus-ring-off" type="date" value={ddmmyyyyToIso(retDate)} min={ddmmyyyyToIso(depDate) || new Date().toISOString().slice(0,10)}
                  onChange={e => setRetDate(isoToDdmmyyyy(e.target.value))} style={{
                  background:'transparent', border:'none', outline:'none',
                  color:'#1a1a2e', fontWeight:700, fontSize:13, fontFamily:'inherit', flex:1 }} />
                <button onClick={() => setRetDate('')}
                  style={{ background:'none', border:'none', color:'#bbb',
                    cursor:'pointer', fontSize:14, lineHeight:1, padding:0, flexShrink:0 }}>✕</button>
              </div>
            ), flex:1.1, error: showSearchErrors && !retDate.trim() }] : []),
            { label:'PASSENGERS & CLASS', content:(
              <div style={{ position:'relative' }}>
                {/* Trigger */}
                <button onClick={() => setPaxOpen(p => !p)} style={{
                  background:'transparent', border:'none', outline:'none', padding:0,
                  color:'#1a1a2e', fontWeight:700, fontSize:13, fontFamily:'inherit',
                  cursor:'pointer', textAlign:'left', width:'100%',
                  display:'flex', alignItems:'center', gap:6,
                }}>
                  <span style={{ flex:1 }}>{paxLabel}</span>
                  <span style={{ fontSize:9, color: O, flexShrink:0 }}>▼</span>
                </button>

                {/* Dropdown panel */}
                {paxOpen && (
                  <div style={{
                    position:'absolute', top:'calc(100% + 14px)', right:0,
                    background:'#fff', borderRadius:14, zIndex:500,
                    boxShadow:'0 12px 48px rgba(0,0,0,.15), 0 2px 8px rgba(0,0,0,.06)',
                    padding:'6px 20px 18px', minWidth:280,
                    border:'1px solid #f0e8e8',
                  }}>
                    {/* Pax counters */}
                    {[
                      { label:'Adults',   sub:'12+ yrs',     val:adults,   set:setAdults,   min:1 },
                      { label:'Children', sub:'2 – 11 yrs',  val:children, set:setChildren, min:0 },
                      { label:'Infants',  sub:'Under 2 yrs', val:infants,  set:setInfants,  min:0 },
                    ].map((row, i, arr) => (
                      <div key={row.label} style={{
                        display:'flex', justifyContent:'space-between', alignItems:'center',
                        padding:'13px 0',
                        borderBottom: i < arr.length - 1 ? '1px solid #f5f0ee' : 'none',
                      }}>
                        <div>
                          <div style={{ fontSize:13.5, fontWeight:600, color:'#1a1a2e' }}>{row.label}</div>
                          <div style={{ fontSize:11, color:'#bbb', marginTop:2 }}>{row.sub}</div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                          <button onClick={() => row.set(Math.max(row.min, row.val - 1))} style={{
                            width:30, height:30, borderRadius:'50%',
                            border:`1.5px solid ${O}`, background:'#fff', color: O,
                            cursor:'pointer', fontSize:18, fontWeight:700, fontFamily:'inherit',
                            display:'flex', alignItems:'center', justifyContent:'center',
                          }}>−</button>
                          <span style={{ fontSize:15, fontWeight:700, color:'#1a1a2e',
                            minWidth:18, textAlign:'center' }}>{row.val}</span>
                          <button onClick={() => row.set(row.val + 1)} style={{
                            width:30, height:30, borderRadius:'50%',
                            border:`1.5px solid ${O}`, background:'#fff', color: O,
                            cursor:'pointer', fontSize:18, fontWeight:700, fontFamily:'inherit',
                            display:'flex', alignItems:'center', justifyContent:'center',
                          }}>+</button>
                        </div>
                      </div>
                    ))}

                    {/* Cabin class */}
                    <div style={{ marginTop:14, position:'relative' }}>
                      <select value={cabinClass} onChange={e => setCabinClass(e.target.value)} style={{
                        width:'100%', padding:'10px 36px 10px 16px',
                        border:`1.5px solid ${O}`, borderRadius:24,
                        color: O, fontSize:13, fontWeight:600, fontFamily:'inherit',
                        background:'#fff', cursor:'pointer', outline:'none',
                        appearance:'none', WebkitAppearance:'none',
                      }}>
                        {CABINS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <span style={{ position:'absolute', right:14, top:'50%',
                        transform:'translateY(-50%)', fontSize:9, color: O,
                        pointerEvents:'none' }}>▼</span>
                    </div>

                    {/* Done */}
                    <button onClick={() => setPaxOpen(false)} style={{
                      width:'100%', marginTop:12, padding:'11px',
                      background:`linear-gradient(135deg,${O},${O2})`,
                      color:'#fff', border:'none', borderRadius:24,
                      fontSize:14, fontWeight:700, cursor:'pointer',
                      fontFamily:'inherit', letterSpacing:'.02em',
                      boxShadow:`0 4px 14px ${O}55`,
                    }}>Done</button>
                  </div>
                )}
              </div>
            ), flex:1.5 },
          ] as { label:string; content: React.ReactNode; flex:number; swap?: boolean; error?: boolean }[]).map((field) => (
            <React.Fragment key={field.label}>
              <div style={{
                flex: field.flex, minWidth:0,
                background:'#fff', border:`1.5px solid ${field.error ? '#e53935' : '#e8ddd4'}`,
                borderRadius:9, padding:'7px 14px',
                display:'flex', flexDirection:'column', justifyContent:'center', gap:2,
              }}>
                <div style={{ fontSize:8.5, fontWeight:800, color: field.error ? '#e53935' : O,
                  letterSpacing:'.12em', textTransform:'uppercase' }}>{field.label}</div>
                {field.content}
              </div>
              {field.swap && (
                <button onClick={swapCities}
                  style={{ flexShrink:0, width:32, height:32, borderRadius:'50%',
                    background:'#fff', border:`1.5px solid ${O}`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:14, color: O, cursor:'pointer', boxShadow:`0 2px 6px ${O}22` }}>⇄</button>
              )}
            </React.Fragment>
          ))}

          {/* SEARCH */}
          <button onClick={handleSearch} style={{
            flexShrink:0, padding:'13px 22px',
            background:`linear-gradient(135deg,${O},${O2})`,
            color:'#fff', border:'none', borderRadius:9,
            fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit',
            letterSpacing:'.06em', boxShadow:`0 4px 14px ${O}55`,
          }}>SEARCH</button>
        </div>

        {/* Combo notice */}
        <div style={{ textAlign:'center', padding:'4px 0 6px',
          fontSize:11.5, fontWeight:700, color:`${O}99`, letterSpacing:'.02em' }}>
          {/* Introducing combo flight selection */}
        </div>
      </div>

      {/* ── LEG SUMMARY ROW (Round-trip or Multi-city) ── */}
      {(trip === 'round' || trip === 'multi') && legs.length > 0 && (
        <div style={{ background:'#fdf5ee', borderBottom:'1px solid #f0dece', padding:'18px 5%' }}>
          <div style={{ maxWidth:1240, margin:'0 auto', display:'flex', alignItems:'stretch', gap:16, flexWrap:'wrap' }}>

            {/* ── One card per leg ── */}
            {legs.map((leg, i) => {
              const sel = selectedLegs[i] ?? null;
              const date = departuresList[i] ?? (i === 0 ? depDate : retDate);
              const route = sel
                ? `${sel.from.split('(')[0].trim()} → ${sel.to.split('(')[0].trim()}`
                : `${(fromCitiesList[i] ?? '').split('(')[0].trim() || '—'} → ${(toCitiesList[i] ?? '').split('(')[0].trim() || '—'}`;
              const isActive = activeLeg === i;
              return (
                <div key={leg.routeKey || i} onClick={() => setActiveLeg(i)} style={{
                  flex:1, minWidth:260, background:'#fff',
                  borderRadius:16, cursor:'pointer',
                  border: isActive ? `1.5px solid ${PK}` : '1.5px solid #f0dece',
                  boxShadow: isActive ? `0 4px 18px ${PK}22` : '0 4px 18px rgba(240,120,32,.08)',
                  padding:'18px 20px', position:'relative',
                }}>

                  {/* Header */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:18 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      {sel ? (
                        <AirlineLogo code={sel.airCode} color={sel.color} size={42} radius={11} />
                      ) : (
                        <div style={{ width:42, height:42, borderRadius:11,
                          background: isActive ? PK : '#1a237e',
                          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                            <path d="M21 3L3 10.5L10 13L13 21L21 3Z" fill="white" fillOpacity=".9" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize:14.5, fontWeight:800, color:'#1a1a2e' }}>
                          {route}
                        </div>
                        {sel && (
                          <div style={{ fontSize:11, color:'#888', marginTop:2 }}>
                            {sel.airline} · {sel.segments.map(s => s.code).join(' · ')}
                          </div>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize:13, fontWeight:600, color:'#888', flexShrink:0 }}>{date}</span>
                  </div>

                  {/* Column headers */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8, marginBottom:8 }}>
                    {['DEPART','DURATION','ARRIVAL','PRICE'].map(h => (
                      <div key={h} style={{ fontSize:9, fontWeight:800, color:'#bbb',
                        letterSpacing:'.1em', textAlign:'center' }}>{h}</div>
                    ))}
                  </div>

                  {/* Value pills */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8 }}>
                    {[sel?.dep ?? '—', sel?.dur ?? '—', sel?.arr ?? '—'].map((val, idx) => (
                      <div key={idx} style={{
                        background:'#fdf5ee', border:'1.5px solid #f0dece', borderRadius:9,
                        padding:'8px 6px', textAlign:'center',
                        fontSize:14, fontWeight:700, color:'#1a1a2e',
                      }}>{val}</div>
                    ))}
                    {/* Price pill */}
                    <div style={{
                      background:'#fdf5ee', border:'1.5px solid #f0dece', borderRadius:9,
                      padding:'8px 6px', textAlign:'center',
                    }}>
                      <div style={{ fontSize:11, color: O, fontWeight:700, lineHeight:1 }}>₹</div>
                      <div style={{ fontSize:15, fontWeight:800, color: O, lineHeight:1.2 }}>
                        {(sel?.price ?? 0).toLocaleString()}.0
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* ── Total Fare + Book Now ── */}
            <div style={{
              minWidth:200, flexShrink:0, background:'#fff',
              borderRadius:16, border:'1.5px solid #f0dece',
              boxShadow:'0 4px 18px rgba(240,120,32,.08)',
              padding:'14px 16px',
              display:'flex', flexDirection:'column', gap:10,
              justifyContent:'center',
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:14, fontWeight:700, color:'#1a1a2e' }}>Total Fare</span>
                <span style={{ fontSize:20, fontWeight:800, color: O }}>
                  ₹ {totalFare.toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => {
                  const params = new URLSearchParams({
                    trip, adults: String(adults), childs: String(children), infants: String(infants),
                    // Carries the exact query this results page sent to /api/flights/search, so
                    // downstream pages (passenger-details/review-booking/payment-details) can
                    // re-run the same search to check whether the fare has changed since selection.
                    origSearch: searchParams.toString(),
                    // Laravel-equivalent of $encodeDataForApi — same "data for the live API" as
                    // origSearch above, just base64-encoded into the $requestd_data shape.
                    encodeDataForApi: base64Encode(buildEncodeDataForApi(searchParams)),
                  });
                  if (trip === 'round') {
                    // Round trip downstream (passenger-details/review-booking/payment-details)
                    // expects the 'out'/'ret' prefixes specifically — keep this contract intact.
                    const out = selectedLegs[0];
                    const ret = selectedLegs[1];
                    const outFull = fromCitiesList[0] || out?.from || '';
                    const retFull = toCitiesList[0] || out?.to || '';
                    if (out) appendFlightParams(params, 'out', out, depDate, outFull, retFull, fromCountry, toCountry);
                    if (ret) appendFlightParams(params, 'ret', ret, retDate, retFull, outFull, toCountry, fromCountry);
                  } else {
                    params.set('no_segments', String(legs.length));
                    legs.forEach((_, i) => {
                      const f = selectedLegs[i];
                      const date = departuresList[i] ?? depDate;
                      if (f) appendLegParams(params, i, f, date);
                    });
                  }
                  window.location.href = `/corporate/passenger-details?${params.toString()}`;
                }}
                style={{
                  width:'100%', padding:'11px 0',
                  background:`linear-gradient(135deg,${O},${O2})`,
                  color:'#fff', border:'none', borderRadius:9,
                  fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:'inherit',
                  boxShadow:`0 4px 14px ${O}44`, letterSpacing:'.02em',
                }}>Book Now</button>
            </div>

          </div>
        </div>
      )}

      {/* ── BODY ── */}
      <div style={{ padding:'18px 5%', maxWidth:1240, margin:'0 auto', boxSizing:'border-box' }}>

        {/* Sort bar */}
        <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:14,
          background:'#fff', borderRadius:12, padding:'10px 20px',
          border:'1px solid #ede8e8', boxShadow:'0 1px 6px rgba(0,0,0,.04)' }}>
          <span style={{ fontSize:12, color:'#999', fontWeight:700,
            marginRight:18, whiteSpace:'nowrap', flexShrink:0 }}>Sort By:</span>
          <div style={{ display:'flex', flex:1, gap:8 }}>
            {([['depart','DEPART'],['arrive','ARRIVE'],['duration','DURATION'],['price','PRICE PER ADULT']] as [SortKey,string][]).map(([key,lbl]) => {
              const active = sortBy === key;
              return (
                <button key={key} onClick={() => setSortBy(key)} style={{
                  flex:1, padding:'9px 0', borderRadius:8,
                  background: active ? `linear-gradient(135deg,${O},${O2})` : '#fff',
                  border: active ? 'none' : '1.5px solid #e8ddd5',
                  color: active ? '#fff' : '#8a7060',
                  fontSize:11.5, fontWeight:800, cursor:'pointer', fontFamily:'inherit',
                  letterSpacing:'.06em',
                  boxShadow: active ? `0 3px 10px ${O}44` : 'none',
                  transition:'all .15s',
                }}>{lbl}</button>
              );
            })}
          </div>
        </div>

        {/* Two-column layout */}
        <div style={{ display:'flex', gap:18, alignItems:'flex-start' }}>

          {/* ── FILTER SIDEBAR ── */}
          <div style={{ width:200, flexShrink:0, position:'sticky', top:140 }}>
            <div style={{ background:'#fff', borderRadius:14, border:'1px solid #ede8e8',
              padding:'14px 16px', boxShadow:'0 2px 12px rgba(0,0,0,.05)' }}>

              {/* Header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <span style={{ fontSize:13, fontWeight:800, color:'#1a1a2e' }}>Filters</span>
                <button onClick={() => { setFilterStops([]); setFilterTime([]); setFilterAir([]); setFilterLayover([]); setPriceMax(computedMaxPrice); }}
                  style={{ background:'none', border:'none', fontSize:11, color: PK,
                    fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                    display:'flex', alignItems:'center', gap:3 }}>✕ Clear filter</button>
              </div>

              {/* ── Stops ── */}
              <div style={{ borderTop:'1px solid #f5ede8', paddingTop:12, marginBottom:12 }}>
                <div style={{ fontSize:10.5, fontWeight:800, color:'#888',
                  letterSpacing:'.08em', textTransform:'uppercase', marginBottom:8 }}>Stops</div>
                <div style={{ display:'flex', gap:6 }}>
                  {([0,1,2] as StopFilter[]).map(n => {
                    const act = filterStops.includes(n);
                    return (
                      <button key={n} onClick={() => toggleArr(setFilterStops, n)} style={{
                        flex:1, padding:'6px 0', borderRadius:6,
                        border: act ? `1.5px solid ${O}` : '1.5px solid #e8e0d8',
                        background: act ? `linear-gradient(135deg,${O},${O2})` : '#faf6f3',
                        color: act ? '#fff' : '#888',
                        fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                        boxShadow: act ? `0 2px 8px ${O}33` : 'none',
                      }}>{n}</button>
                    );
                  })}
                </div>
              </div>

              {/* ── Departure Time ── */}
              <div style={{ borderTop:'1px solid #f5ede8', paddingTop:12, marginBottom:12 }}>
                <div style={{ fontSize:10.5, fontWeight:800, color:'#888',
                  letterSpacing:'.08em', textTransform:'uppercase', marginBottom:8 }}>Departure From Delhi</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:4 }}>
                  {([
                    ['00-06','🌙','00–06'],
                    ['06-12','⚙️','06–12'],
                    ['12-18','☀️','12–18'],
                    ['18-00','🌛','18–00'],
                  ] as [TimeSlot,string,string][]).map(([slot,icon,label]) => {
                    const act = filterTime.includes(slot);
                    return (
                      <button key={slot} onClick={() => toggleArr(setFilterTime, slot)} style={{
                        padding:'7px 2px', borderRadius:7,
                        border: act ? `1.5px solid ${O}` : '1.5px solid #e8e0d8',
                        background: act ? `${O}10` : '#faf6f3',
                        cursor:'pointer', fontFamily:'inherit', textAlign:'center',
                        boxShadow: act ? `0 2px 6px ${O}22` : 'none',
                      }}>
                        <div style={{ fontSize:13, lineHeight:1, marginBottom:3 }}>{icon}</div>
                        <div style={{ fontSize:8.5, fontWeight:700,
                          color: act ? O : '#999', lineHeight:1.3 }}>{label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Airlines ── */}
              <div style={{ borderTop:'1px solid #f5ede8', paddingTop:12, marginBottom:12 }}>
                <div style={{ fontSize:10.5, fontWeight:800, color:'#888',
                  letterSpacing:'.08em', textTransform:'uppercase', marginBottom:8 }}>Airlines</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {airlineList.map(a => {
                    const checked = filterAir.includes(a.code);
                    return (
                      <label key={a.code} onClick={() => toggleArr(setFilterAir, a.code)}
                        style={{ display:'flex', alignItems:'center', gap:8,
                          cursor:'pointer', userSelect:'none',
                          padding:'5px 8px', borderRadius:7,
                          background: checked ? `${O}08` : 'transparent',
                          border: checked ? `1px solid ${O}33` : '1px solid transparent',
                        }}>
                        <div style={{
                          width:14, height:14, borderRadius:4, flexShrink:0,
                          border: checked ? `2px solid ${O}` : '1.5px solid #ccc',
                          background: checked ? O : '#fff',
                          display:'flex', alignItems:'center', justifyContent:'center',
                        }}>
                          {checked && <span style={{ fontSize:9, color:'#fff', fontWeight:900, lineHeight:1 }}>✓</span>}
                        </div>
                        <span style={{ fontSize:11.5, color: checked ? O : '#666', fontWeight: checked ? 700 : 500 }}>
                          {a.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* ── Layover ── */}
              <div style={{ borderTop:'1px solid #f5ede8', paddingTop:12, marginBottom:12 }}>
                <div style={{ fontSize:10.5, fontWeight:800, color:'#888',
                  letterSpacing:'.08em', textTransform:'uppercase', marginBottom:8 }}>Layover Airport</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {layoverCities.map(city => {
                    const checked = filterLayover.includes(city);
                    const count   = activeFlights.filter(f => getLayoverCity(f) === city).length;
                    return (
                      <label key={city} onClick={() => toggleArr(setFilterLayover, city)}
                        style={{ display:'flex', alignItems:'center', gap:8,
                          cursor:'pointer', userSelect:'none',
                          padding:'6px 8px', borderRadius:7,
                          background: checked ? `${O}08` : 'transparent',
                          border: checked ? `1px solid ${O}33` : '1px solid transparent',
                        }}>
                        <div style={{
                          width:14, height:14, borderRadius:4, flexShrink:0,
                          border: checked ? `2px solid ${O}` : '1.5px solid #ccc',
                          background: checked ? O : '#fff',
                          display:'flex', alignItems:'center', justifyContent:'center',
                        }}>
                          {checked && <span style={{ fontSize:9, color:'#fff', fontWeight:900, lineHeight:1 }}>✓</span>}
                        </div>
                        <span style={{ flex:1, fontSize:11.5, color: checked ? O : '#666', fontWeight: checked ? 700 : 500 }}>
                          {city}
                        </span>
                        <span style={{ fontSize:10, color:'#bbb', fontWeight:600 }}>{count}</span>
                      </label>
                    );
                  })}
                </div>
                {filterLayover.length > 0 && (
                  <div style={{ marginTop:6, fontSize:10, color: O, fontWeight:600, paddingLeft:2 }}>
                    {activeFlights.filter(f => filterLayover.includes(getLayoverCity(f) ?? '')).length} flights match
                  </div>
                )}
              </div>

              {/* ── Price Range ── */}
              <div style={{ borderTop:'1px solid #f5ede8', paddingTop:12, marginBottom:12 }}>
                <div style={{ fontSize:10.5, fontWeight:800, color:'#888',
                  letterSpacing:'.08em', textTransform:'uppercase', marginBottom:10 }}>Price Range</div>
                <input type="range" min={computedMinPrice} max={computedMaxPrice} value={priceMax}
                  onChange={e => setPriceMax(Number(e.target.value))}
                  style={{ width:'100%', accentColor: O, height:4 }} />
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
                  <span style={{ fontSize:10.5, color:'#aaa' }}>₹{computedMinPrice.toLocaleString()}</span>
                  <span style={{ fontSize:10.5, fontWeight:700, color: O }}>₹{priceMax.toLocaleString()}</span>
                </div>
              </div>

              {/* ── Aircraft ── */}
              <div style={{ borderTop:'1px solid #f5ede8', paddingTop:12 }}>
                <div style={{ fontSize:10.5, fontWeight:800, color:'#888',
                  letterSpacing:'.08em', textTransform:'uppercase', marginBottom:8 }}>Aircraft</div>
                <label style={{ display:'flex', alignItems:'center', gap:8,
                  cursor:'pointer', userSelect:'none', fontSize:11.5, color:'#666' }}>
                  <input type="checkbox" style={CB} />
                  Airbus A320
                </label>
              </div>

            </div>
          </div>

          {/* ── RESULTS LIST ── */}
          <div style={{ flex:1, minWidth:0 }}>
            {searchMsg && activeFlights.length === 0 ? (
              <div style={{ background:'#fff', borderRadius:12, padding:'40px 24px',
                textAlign:'center', border:'1px solid #ede8e8' }}>
                <div style={{ fontSize:36, marginBottom:10 }}>✈️</div>
                <div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>{searchMsg}</div>
              </div>
            ) : sorted.length === 0 ? (
              <div style={{ background:'#fff', borderRadius:12, padding:'40px 24px',
                textAlign:'center', border:'1px solid #ede8e8' }}>
                <div style={{ fontSize:36, marginBottom:10 }}>✈️</div>
                <div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>No flights match your filters</div>
                <div style={{ fontSize:13, color:'#aaa' }}>Try adjusting or clearing your filters.</div>
              </div>
            ) : sorted.map(f => (
              <FlightCard
                key={f.id}
                flight={f}
                trip={trip}
                legRoutes={legRoutes}
                selected={selectedLegs[activeLeg]?.id === f.id}
                onSelect={f => setSelectedLegs(prev => ({ ...prev, [activeLeg]: f }))}
                onBook={(f) => {
                  const params = new URLSearchParams({
                    trip, adults: String(adults), childs: String(children), infants: String(infants),
                    origSearch: searchParams.toString(),
                    encodeDataForApi: base64Encode(buildEncodeDataForApi(searchParams)),
                  });
                  appendFlightParams(params, 'out', f, depDate,
                    fromCitiesList[0] || f.from, toCitiesList[0] || f.to, fromCountry, toCountry);
                  // Matches Laravel's route('flights_detail', ['flight_id'=>base64_encode($flightRoot->ID),
                  // 'data'=>$encodedData, ...]) literally, for the one-way case (a single selected flight).
                  params.set('flight_id', base64Encode(f.yatraId));
                  params.set('data', base64Encode(f));
                  window.location.href = `/corporate/passenger-details?${params.toString()}`;
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
