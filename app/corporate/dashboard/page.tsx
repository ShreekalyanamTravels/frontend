'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Playfair_Display, Inter } from 'next/font/google';
import CorpFooter from '../components/CorpFooter';
import BookingProgress from '../components/BookingProgress';
import { TravelerPopover, type TravelerEntry } from '../components/TravelerPopover';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import CorpHeader from '../components/CorpHeader';

const playfair = Playfair_Display({ subsets:['latin'], weight:['700'], style:['italic'] });
const inter    = Inter({ subsets:['latin'], weight:['400','500','600','700','800'] });

const O  = '#f07820';
const O2 = '#e86d18';

/* ── Indian airport/city detection ── */
const INDIAN_KEYWORDS = new Set([
  // IATA codes
  'del','bom','blr','maa','hyd','ccu','cok','ixc','amd','pnq','goi','vns','jai','lko','pat',
  'ixb','bbi','ixr','ixg','ixl','ixa','ixs','ixu','ixw','ixz','vtz','cjb','trv','idr',
  'sxr','ixm','atq','bho','nag','jlr','gau','dib','tez','jrh','moz','hbx','bdq','raj',
  // common city names
  'delhi','mumbai','bangalore','bengaluru','chennai','hyderabad','kolkata','kochi','cochin',
  'chandigarh','ahmedabad','pune','goa','varanasi','jaipur','lucknow','patna','bhubaneswar',
  'ranchi','hubli','jammu','leh','agartala','silchar','dibrugarh','jorhat','imphal','indore',
  'surat','nagpur','jabalpur','guwahati','amritsar','bhopal','visakhapatnam','vizag','coimbatore',
  'thiruvananthapuram','trivandrum','mangalore','tirupati','vadodara','rajkot','raipur',
  'india','ind',
]);

function isIndian(city: string): boolean {
  const lower = city.toLowerCase();
  for (const kw of INDIAN_KEYWORDS) {
    if (lower.includes(kw)) return true;
  }
  return false;
}

function getResultsBasePath(from: string, to: string): string {
  const domestic = isIndian(from) && isIndian(to);
  return domestic ? '/corporate/results' : '/corporate/results/international';
}

function formatDateForQuery(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function FloatField({ label, flex, value, onChange, placeholder, O, type='text', valueColor, min, error }:
  { label:string; flex:number; value:string; onChange:(v:string)=>void;
    placeholder:string; O:string; type?:string; valueColor?:string; min?:string; error?:boolean }) {
  return (
    <div style={{ position:'relative', flex, minWidth:0 }}>
      <span style={{ position:'absolute', top:-9, left:12, zIndex:1,
        background:'#fff', padding:'0 4px',
        fontSize:9, fontWeight:700, color: error ? '#e53935' : '#2066cc',
        letterSpacing:'.12em', textTransform:'uppercase' }}>
        {label}{error && ' *'}
      </span>
      <div style={{ border:`1.5px solid ${error ? '#e53935' : '#cdd5f0'}`, borderRadius:10,
        padding:'12px 14px', background:'#fff' }}>
        <input
          type={type} value={value} min={min}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ border:'none', outline:'none', width:'100%', fontSize:14,
            color: valueColor || '#1a1a2e', fontWeight: valueColor ? 600 : 500,
            fontFamily:'inherit', background:'transparent' }}
        />
      </div>
      {error && (
        <span style={{ position:'absolute', top:'100%', left:12, marginTop:4,
          fontSize:10.5, color:'#e53935', fontWeight:600, whiteSpace:'nowrap' }}>
          This field is required
        </span>
      )}
    </div>
  );
}

interface CityOption { code:string; name:string; city:string; country:string; countryCode:string }

function CityField({ label, flex, value, onChange, placeholder, error }:
  { label:string; flex:number; value:string; onChange:(v:string, opt?:CityOption)=>void; placeholder:string; error?:boolean }) {
  const [options, setOptions] = useState<CityOption[]>([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef      = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  function handleChange(v: string) {
    onChange(v);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = v.trim();
    if (q.length < 3) { setOptions([]); setLoading(false); return; }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/flights/search-city?key=${encodeURIComponent(q)}`);
        const data = await res.json();
        const flat: CityOption[] = [];
        for (const grp of [...(data.airports ?? []), ...(data.nearbyAirports ?? [])]) {
          for (const f of grp.flight ?? []) {
            flat.push({ code:f.ac, name:f.an, city:f.ct, country:f.cn, countryCode:f.cc });
          }
        }
        setOptions(flat);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function select(opt: CityOption) {
    onChange(`${opt.city}, ${opt.country} (${opt.code})`, opt);
    setOpen(false);
    setOptions([]);
  }

  return (
    <div ref={boxRef} style={{ position:'relative', flex, minWidth:0 }}>
      <span style={{ position:'absolute', top:-9, left:12, zIndex:1,
        background:'#fff', padding:'0 4px',
        fontSize:9, fontWeight:700, color: error ? '#e53935' : '#2066cc',
        letterSpacing:'.12em', textTransform:'uppercase' }}>
        {label}{error && ' *'}
      </span>
      <div style={{ border:`1.5px solid ${error ? '#e53935' : '#cdd5f0'}`, borderRadius:10,
        padding:'12px 14px', background:'#fff' }}>
        <input
          className="focus-ring-off"
          value={value}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          style={{ border:'none', outline:'none', width:'100%', fontSize:14,
            color:'#1a1a2e', fontWeight:500,
            fontFamily:'inherit', background:'transparent' }}
        />
      </div>

      {open && (loading || options.length > 0) && (
        <div style={{
          position:'absolute', top:'calc(100% + 6px)', left:0, right:0,
          background:'#fff', borderRadius:12, zIndex:500, maxHeight:280, overflowY:'auto',
          boxShadow:'0 12px 40px rgba(0,0,0,.15), 0 2px 8px rgba(0,0,0,.06)',
          border:'1px solid #eee',
        }}>
          {loading ? (
            <div style={{ padding:'12px 16px', fontSize:12.5, color:'#999' }}>Searching…</div>
          ) : (
            options.map((o, i) => (
              <div key={`${o.code}-${o.city}-${i}`} onClick={() => select(o)} style={{
                padding:'10px 16px', cursor:'pointer',
                borderBottom: i < options.length - 1 ? '1px solid #f5f5f5' : 'none',
              }}>
                <div style={{ fontSize:13.5, fontWeight:700, color:'#1a1a2e' }}>
                  {o.code} - {o.name}
                </div>
                <div style={{ fontSize:11.5, color:'#888', marginTop:2 }}>{o.city}, {o.country}</div>
                <div style={{ fontSize:10, color:'#bbb', marginTop:1 }}>{o.countryCode}</div>
              </div>
            ))
          )}
        </div>
      )}

      {error && !open && (
        <span style={{ position:'absolute', top:'100%', left:12, marginTop:4,
          fontSize:10.5, color:'#e53935', fontWeight:600, whiteSpace:'nowrap' }}>
          This field is required
        </span>
      )}
    </div>
  );
}

const CABINS = ['Economy','Business','First Class','Premium Economy'];

interface TravellersValue { adults:number; kids:number; infants:number; cabin:string }

function TravellersField({ flex, O, O2, value, onChange }:
  { flex: number; O: string; O2: string; value: TravellersValue; onChange:(v:TravellersValue)=>void }) {
  const [open, setOpen] = useState(false);
  const { adults, kids, infants, cabin } = value;
  const setAdults  = (v:number) => onChange({ ...value, adults:v });
  const setKids    = (v:number) => onChange({ ...value, kids:v });
  const setInfants = (v:number) => onChange({ ...value, infants:v });
  const setCabin   = (v:string) => onChange({ ...value, cabin:v });

  const total   = adults + kids + infants;
  const display = `${total} Traveler${total !== 1 ? 's' : ''},${cabin}`;

  const ROWS = [
    { label:'Adults',   sub:'12+ yrs',    val:adults,  set:setAdults,  min:1 },
    { label:'Children', sub:'2 - 11 yrs',  val:kids,    set:setKids,    min:0 },
    { label:'Infants',  sub:'under 2 yrs', val:infants, set:setInfants, min:0 },
  ];

  return (
    <div style={{ position:'relative', flex, minWidth:0 }}>
      <span style={{ position:'absolute', top:-9, left:12, zIndex:1,
        background:'#fff', padding:'0 4px', fontSize:9, fontWeight:700,
        color:'#2066cc', letterSpacing:'.12em', textTransform:'uppercase' }}>
        TRAVELLERS
      </span>

      {/* Trigger */}
      <div onClick={() => setOpen(p => !p)} style={{
        border:`1.5px solid ${open ? '#c9184a' : '#cdd5f0'}`,
        borderRadius:10, padding:'12px 14px', background:'#fff',
        cursor:'pointer', transition:'border-color .15s',
      }}>
        <span style={{ fontSize:14, color:O, fontWeight:600, fontFamily:'inherit', whiteSpace:'nowrap' }}>
          {display}
        </span>
      </div>

      {/* Panel */}
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 8px)', right:0,
          background:'#fff', borderRadius:16, zIndex:400,
          boxShadow:'0 12px 48px rgba(0,0,0,.15), 0 2px 8px rgba(0,0,0,.06)',
          padding:'4px 22px 22px', minWidth:288,
          border:'1px solid #f5e8e8',
        }}>
          {/* Pax counters */}
          {ROWS.map((row, i) => (
            <div key={row.label} style={{
              display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'14px 0',
              borderBottom: i < ROWS.length - 1 ? '1px solid #f5f0ee' : 'none',
            }}>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:'#1a1a2e' }}>{row.label}</div>
                <div style={{ fontSize:11, color:'#bbb', marginTop:2 }}>{row.sub}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <button onClick={() => row.set(Math.max(row.min, row.val - 1))} style={{
                  width:30, height:30, borderRadius:'50%',
                  border:`1.5px solid ${O}`, background:'#fff', color:O,
                  cursor:'pointer', fontSize:18, fontWeight:700, fontFamily:'inherit',
                  display:'flex', alignItems:'center', justifyContent:'center', lineHeight:'1',
                }}>−</button>
                <span style={{ fontSize:16, fontWeight:700, color:'#1a1a2e',
                  minWidth:18, textAlign:'center' }}>{row.val}</span>
                <button onClick={() => row.set(row.val + 1)} style={{
                  width:30, height:30, borderRadius:'50%',
                  border:`1.5px solid ${O}`, background:'#fff', color:O,
                  cursor:'pointer', fontSize:18, fontWeight:700, fontFamily:'inherit',
                  display:'flex', alignItems:'center', justifyContent:'center', lineHeight:'1',
                }}>+</button>
              </div>
            </div>
          ))}

          {/* Cabin class select */}
          <div style={{ position:'relative', margin:'16px 0 20px' }}>
            <select value={cabin} onChange={e => setCabin(e.target.value)} style={{
              width:'100%', padding:'10px 36px 10px 16px',
              border:`1.5px solid ${O}`, borderRadius:26,
              color:O, fontSize:13.5, fontWeight:600, fontFamily:'inherit',
              background:'#fff', cursor:'pointer', outline:'none',
              appearance:'none', WebkitAppearance:'none' as React.CSSProperties['WebkitAppearance'],
            }}>
              {CABINS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span style={{ position:'absolute', right:14, top:'50%',
              transform:'translateY(-50%)', fontSize:10, color:O, pointerEvents:'none' }}>▼</span>
          </div>

          {/* Done */}
          <button onClick={() => setOpen(false)} style={{
            width:'100%', padding:'12px',
            background:`linear-gradient(135deg,${O},${O2})`,
            color:'#fff', border:'none', borderRadius:26,
            fontSize:15, fontWeight:700, cursor:'pointer',
            fontFamily:'inherit', letterSpacing:'.02em',
            boxShadow:`0 4px 16px ${O}55`,
          }}>Done</button>
        </div>
      )}
    </div>
  );
}

const FLIGHT_STEPS   = ['Flight Search','Flight Results','Passenger Details','Review Booking','Payment Details','Booking Confirmation'];
const INSURANCE_STEPS = ['Plan Search','Select Plan','Traveller Details','Payment','Policy Issued'];

const COUNTRIES = [
  'India','United Arab Emirates','United Kingdom','United States','Singapore','Thailand',
  'Malaysia','Sri Lanka','Nepal','Maldives','Australia','Canada','Germany','France',
  'Japan','South Korea','Indonesia','Vietnam','Philippines','New Zealand','Switzerland',
  'Italy','Spain','Greece','Turkey','Egypt','South Africa','Kenya','Dubai','Bahrain','Qatar','Oman',
];

const INS_TYPES = ['Individual','Family Floater','Annual Multitrip'];

/* Compact label+select cell used in the insurance search bar (Insurance Type / Default From
 * Country / Travelling Country). Native selects styled with appearance:none previously had no
 * visible caret at all on the control itself (the small ▼ sat next to the label instead) and no
 * focus indicator — this pairs a real caret with the value and gives keyboard/mouse focus a
 * visible cue instead of `outline:none` with nothing in its place. Also carries an icon, a
 * required "*" marker, a placeholder "Select…" state (value stays '' until chosen), and an
 * error state so unpicked required fields are caught before submit rather than silently
 * defaulting to whatever option happened to be first. */
function LabeledSelect({ label, value, onChange, options, flex, borderRight, required, error, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
  flex: number; borderRight?: boolean; required?: boolean; error?: boolean; placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const active = focused || hovered;
  const isEmpty = !value;
  const accent = error ? '#c0392b' : O;
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex, padding: '11px 16px',
        borderRight: borderRight ? '1.5px solid #e8e2db' : undefined,
        background: error ? '#fdf3f2' : active ? '#fff8f2' : '#fff',
        transition: 'background .15s',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: error ? '#c0392b' : '#b0a89e',
          letterSpacing: '.09em', textTransform: 'uppercase' }}>{label}</span>
        {required && <span style={{ color: accent, fontSize: 11, fontWeight: 800, lineHeight: 1 }}>*</span>}
      </div>
      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            fontSize: 15, fontWeight: 800, color: isEmpty ? '#c5bdb5' : '#1a1a2e', border: 'none',
            outline: active ? `1.5px solid ${accent}` : 'none', outlineOffset: 2, borderRadius: 4,
            background: 'transparent', fontFamily: 'inherit', appearance: 'none',
            cursor: 'pointer', width: '100%', paddingRight: 18,
          }}>
          {placeholder && <option value="" disabled hidden>{placeholder}</option>}
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <span style={{
          position: 'absolute', right: 1, top: '50%',
          transform: active ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)',
          fontSize: 9, color: active ? accent : '#c5bdb5', transition: 'transform .15s, color .15s',
          pointerEvents: 'none',
        }}>▼</span>
      </div>
      {error && (
        <div style={{ marginTop: 4, background: '#c0392b', borderRadius: 5,
          padding: '2px 8px', display: 'inline-block' }}>
          <span style={{ fontSize: 8.5, fontWeight: 700, color: '#fff' }}>*Required</span>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<'flights'|'insurance'>('flights');
  type ProductInfo = { status:'active'|'inactive'; availability:'live'|'coming_soon' };
  // Starts empty rather than defaulting every product to 'active' — the tab filter below only
  // shows a tab once its real status has come back from /api/products, so nothing renders that
  // hasn't been confirmed active yet. Defaulting to all-active previously flashed every tab
  // (including inactive ones like Hotels/Travel/Visa) for a moment before this effect corrected it.
  const [productStatus, setProductStatus] = useState<Record<string, ProductInfo>>({});
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        const map: Record<string, ProductInfo> = {};
        (data.products || []).forEach((p: { name:string; status:'active'|'inactive'; availability:'live'|'coming_soon' }) => {
          map[p.name.toLowerCase()] = { status: p.status, availability: p.availability };
        });
        setProductStatus(prev => ({ ...prev, ...map }));
      })
      .finally(() => setProductsLoading(false));
  }, []);

  useEffect(() => {
    if (!userLoading && !user) router.push('/');
  }, [userLoading, user, router]);

  // Flight state
  const todayStr = new Date().toISOString().slice(0, 10);
  const [trip, setTrip] = useState<'one-way'|'round'|'multi'>('one-way');
  const [from, setFrom] = useState('');
  const [to,   setTo  ] = useState('');
  const [dep,  setDep ] = useState('');
  const [ret,  setRet ] = useState('');
  const [fromCountry, setFromCountry] = useState('');
  const [toCountry,   setToCountry]   = useState('');
  const [legs, setLegs] = useState([{ from:'', to:'', dep:'', fromCountry:'', toCountry:'' }]);
  const [showFlightErrors, setShowFlightErrors] = useState(false);
  const [travellers, setTravellers] = useState<TravellersValue>({ adults:1, kids:0, infants:0, cabin:'Economy' });

  function buildFlightQuery(): string {
    const params = new URLSearchParams();
    const typeMap: Record<'one-way'|'round'|'multi', string> = { 'one-way':'O', round:'R', multi:'M' };
    params.set('type', typeMap[trip]);

    let fromCities: string[], fromCountries: string[], toCities: string[], toCountries: string[], departures: string[];

    if (trip === 'multi') {
      fromCities    = legs.map(l => l.from);
      fromCountries = legs.map(l => l.fromCountry);
      toCities      = legs.map(l => l.to);
      toCountries   = legs.map(l => l.toCountry);
      departures    = legs.map(l => formatDateForQuery(l.dep));
    } else if (trip === 'round') {
      fromCities    = [from, to];
      fromCountries = [fromCountry, toCountry];
      toCities      = [to, from];
      toCountries   = [toCountry, fromCountry];
      departures    = [formatDateForQuery(dep), formatDateForQuery(ret)];
    } else {
      fromCities    = [from];
      fromCountries = [fromCountry];
      toCities      = [to];
      toCountries   = [toCountry];
      departures    = [formatDateForQuery(dep)];
    }

    params.set('no_segments', String(fromCities.length));
    fromCities.forEach(c => params.append('from_city[]', c));
    fromCountries.forEach(c => params.append('origin_country[]', c));
    toCities.forEach(c => params.append('to_city[]', c));
    toCountries.forEach(c => params.append('destination_country[]', c));
    departures.forEach(d => params.append('departure[]', d));

    const total = travellers.adults + travellers.kids + travellers.infants;
    params.append('travelers[]', ` ${total} Traveler(s),${travellers.cabin} `);
    params.set('adults', ` ${travellers.adults} `);
    params.set('childs', ` ${travellers.kids} `);
    params.set('infants', ` ${travellers.infants} `);
    params.set('class', travellers.cabin);
    params.set('fare_type', '1');

    return params.toString();
  }

  function handleSearchFlights() {
    const valid = trip === 'multi'
      ? legs.every(l => l.from.trim() && l.to.trim() && l.dep.trim())
      : Boolean(from.trim() && to.trim() && dep.trim() && (trip !== 'round' || ret.trim()));

    if (!valid) {
      setShowFlightErrors(true);
      return;
    }

    setShowFlightErrors(false);
    const dest = trip === 'multi' ? legs[legs.length - 1].to : to;
    const orig = trip === 'multi' ? legs[0].from : from;
    router.push(`${getResultsBasePath(orig, dest)}?${buildFlightQuery()}`);
  }

  // Insurance state
  const [insType,    setInsType]    = useState('');
  const [insFrom,    setInsFrom]    = useState('');
  const [insDest,    setInsDest]    = useState('');
  const [insStart,   setInsStart]   = useState('');
  const [insEnd,     setInsEnd]     = useState('');
  const [insPersons, setInsPersons] = useState(1);
  const [insDob,     setInsDob]     = useState('');
  const [insTravelers, setInsTravelers] = useState<TravelerEntry[]>([{ dob: '', relationship: '' }]);
  const [showInsuranceErrors, setShowInsuranceErrors] = useState(false);

  // Keep the per-traveler list sized to the current passenger count for Family Floater
  // (each traveler gets their own relationship + DOB instead of one shared DOB).
  useEffect(() => {
    if (insType !== 'Family Floater') return;
    setInsTravelers(prev => {
      const next = prev.slice(0, insPersons);
      while (next.length < insPersons) next.push({ dob: '', relationship: '' });
      if (next[0]) next[0] = { ...next[0], relationship: 'SELF' };
      return next;
    });
  }, [insType, insPersons]);

  // Annual Multitrip: start date defaults to today, end date is always exactly one year later.
  // Computed from the string parts directly (not via Date -> toISOString) so a local timezone
  // ahead of UTC doesn't roll the result back a day.
  useEffect(() => {
    if (insType !== 'Annual Multitrip') return;
    const start = insStart || new Date().toISOString().slice(0, 10);
    if (!insStart) setInsStart(start);
    const [y, m, d] = start.split('-').map(Number);
    setInsEnd(`${y + 1}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }, [insType, insStart]);

  const insNoDays = insStart && insEnd
    ? Math.max(0, Math.round((new Date(insEnd).getTime() - new Date(insStart).getTime()) / 86400000))
    : 0;

  function swap() {
    const t = from; setFrom(to); setTo(t);
    const tc = fromCountry; setFromCountry(toCountry); setToCountry(tc);
  }
  function swapLeg(i: number) {
    setLegs(p => p.map((l, idx) => idx === i
      ? { ...l, from: l.to, to: l.from, fromCountry: l.toCountry, toCountry: l.fromCountry }
      : l));
  }
  function addLeg() { setLegs(p => [...p, { from:'', to:'', dep:'', fromCountry:'', toCountry:'' }]); }
  function removeLeg(i: number) { setLegs(p => p.filter((_, idx) => idx !== i)); }
  function updateLeg(i: number, f: 'dep', v: string) {
    setLegs(p => p.map((l, idx) => idx === i ? { ...l, [f]: v } : l));
  }
  function updateLegCity(i: number, which: 'from'|'to', v: string, countryCode?: string) {
    const countryField = which === 'from' ? 'fromCountry' : 'toCountry';
    setLegs(p => p.map((l, idx) => idx === i ? { ...l, [which]: v, [countryField]: countryCode ?? '' } : l));
  }

  return (
    <div className={inter.className} style={{ background:'#f9f2ec', minHeight:'100vh', display:'flex', flexDirection:'column' }}>

      {/* ─── NAVBAR ─── */}
      <CorpHeader />

      {/* ─── STEPPER ─── */}
      <div style={{
        background:`linear-gradient(90deg,${O} 0%,${O2} 100%)`,
        padding:'0 5%', boxShadow:'0 2px 10px rgba(240,120,32,.3)',
      }}>
        {/* outer padding wrapper — separate from position:relative so top:18 = exact circle center */}
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'14px 0' }}>
          <div style={{ display:'flex', justifyContent:'space-between', position:'relative' }}>

            {/* connector line — top:18 = half of 36px circle, runs circle-center to circle-center */}
            <div style={{
              position:'absolute', left:'4%', right:'4%',
              top:18, transform:'translateY(-50%)',
              height:2, background:'rgba(255,255,255,.35)', zIndex:0,
            }} />

            {(activeTab === 'insurance' ? INSURANCE_STEPS : FLIGHT_STEPS).map((s, i) => (
              <div key={s} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:7, zIndex:1, minWidth:80 }}>
                <div style={{
                  width:36, height:36, borderRadius:'50%',
                  background: i === 0 ? '#fff' : 'rgba(255,255,255,.18)',
                  border: i === 0 ? '2.5px solid #fff' : '2px solid rgba(255,255,255,.55)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:13.5, fontWeight:800,
                  color: i === 0 ? O : '#fff',
                  boxShadow: i === 0 ? '0 2px 12px rgba(0,0,0,.15)' : 'none',
                }}>
                  {i + 1}
                </div>
                <span style={{
                  fontSize:10, color: i === 0 ? '#fff' : 'rgba(255,255,255,.7)',
                  fontWeight: i === 0 ? 700 : 400, whiteSpace:'nowrap',
                  letterSpacing:'.01em', textAlign:'center',
                }}>
                  {s}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <main style={{ flex:1, padding:'40px 5% 60px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>

          {/* ── SEARCH CARD ── */}
          <div style={{
            background:'#fff',
            borderRadius:18,
            boxShadow:'0 8px 48px rgba(0,0,0,.10), 0 2px 10px rgba(0,0,0,.06)',
            padding:'36px 40px 32px',
            border:'1px solid rgba(0,0,0,.04)',
          }}>

            {/* Heading */}
            <div style={{ marginBottom:28 }}>
              <h2 style={{ fontSize:23, fontWeight:800, color:'#1a1a2e', margin:'0 0 5px', letterSpacing:'-.01em' }}>
                {activeTab === 'flights' ? 'Search Your Next Flight' : 'Travel Insurance'}
              </h2>
              <p style={{ fontSize:13, color:'#aaa', margin:0, lineHeight:1.6 }}>
                {activeTab === 'flights'
                  ? 'Compare fares quickly and book the best option for your journey.'
                  : 'Get instant quotes for comprehensive travel insurance coverage.'}
              </p>
            </div>

            {/* Service tabs — dynamic, driven by the `products` table status */}
            <div style={{ display:'flex', gap:10, marginBottom:26 }}>
              {productsLoading ? (
                <>
                  {[86, 108].map((w, i) => (
                    <div key={i} style={{
                      width:w, height:39, borderRadius:28,
                      border:'1.5px solid #e8e8e8', background:'#f2f2f2',
                      animation:'tabPulse 1.2s ease-in-out infinite',
                    }} />
                  ))}
                  <style>{`@keyframes tabPulse{0%,100%{opacity:.6}50%{opacity:1}}`}</style>
                </>
              ) : ([
                { key:'flight',    icon:'✈',   label:'Flights',   selectable:true,  tab:'flights' as const   },
                { key:'insurance', icon:'🛡️', label:'Insurance', selectable:true,  tab:'insurance' as const },
                { key:'hotels',    icon:'🏨',  label:'Hotels',    selectable:false, tab:null                 },
                { key:'travel',    icon:'🧳',  label:'Travel',    selectable:false, tab:null                 },
                { key:'visa',      icon:'🌐',  label:'Visa',      selectable:false, tab:null                 },
              ]).filter(t => productStatus[t.key]?.status === 'active').map(t => {
                const info = productStatus[t.key];
                const enabled = info?.status === 'active' && info?.availability === 'live';

                if (enabled && t.selectable && t.tab) {
                  const isActive = activeTab === t.tab;
                  return (
                    <div key={t.key} onClick={() => setActiveTab(t.tab!)} style={{
                      display:'flex', alignItems:'center', gap:7,
                      padding:'10px 24px',
                      background: isActive ? `linear-gradient(135deg,${O},${O2})` : '#fafafa',
                      color: isActive ? '#fff' : '#555',
                      border: isActive ? 'none' : '1.5px solid #e8e8e8',
                      borderRadius:28, fontSize:13.5, fontWeight:700, cursor:'pointer',
                      boxShadow: isActive ? `0 4px 14px ${O}55` : 'none',
                    }}>
                      <span style={{ fontSize:15 }}>{t.icon}</span> {t.label}
                    </div>
                  );
                }

                if (enabled) {
                  return (
                    <div key={t.key} style={{
                      display:'flex', alignItems:'center', gap:7,
                      padding:'10px 20px',
                      border:'1.5px solid #e8e8e8', borderRadius:28,
                      fontSize:13.5, color:'#555', cursor:'default', background:'#fafafa',
                    }}>
                      <span style={{ fontSize:15 }}>{t.icon}</span> {t.label}
                    </div>
                  );
                }

                return (
                  <div key={t.key} style={{
                    display:'flex', alignItems:'center', gap:7,
                    padding:'10px 20px',
                    border:'1.5px solid #e8e8e8', borderRadius:28,
                    fontSize:13.5, color:'#999', cursor:'default', background:'#fafafa',
                  }}>
                    <span style={{ fontSize:15 }}>{t.icon}</span>
                    {t.label}
                    <span style={{
                      fontSize:9, fontWeight:700, background:O,
                      color:'#fff', padding:'2px 8px', borderRadius:12, marginLeft:3,
                      letterSpacing:'.04em',
                    }}>Soon</span>
                  </div>
                );
              })}
            </div>

            {activeTab === 'insurance' ? (
              /* ── INSURANCE FORM ── */
              <div>
                {/* Row 1 — three connected boxes */}
                <div style={{ display:'flex', borderRadius:14, overflow:'hidden', marginBottom:10,
                  boxShadow:'0 2px 12px rgba(0,0,0,.07)', border:'1.5px solid #e8e2db' }}>

                  <LabeledSelect
                    label="Insurance Type" flex={1.3} borderRight required
                    placeholder="Select Insurance Type"
                    error={showInsuranceErrors && !insType}
                    value={insType}
                    onChange={v => {
                      setInsType(v);
                      if (v === 'Individual' || v === 'Annual Multitrip') setInsPersons(1);
                      else if (v === 'Family Floater') setInsPersons(p => p < 2 ? 2 : p > 6 ? 6 : p);
                    }}
                    options={INS_TYPES}
                  />

                  <LabeledSelect
                    label="Default From Country" flex={1} borderRight required
                    placeholder="Select Country"
                    error={showInsuranceErrors && !insFrom}
                    value={insFrom} onChange={setInsFrom}
                    options={COUNTRIES}
                  />

                  <LabeledSelect
                    label="Travelling Country" flex={1} required
                    placeholder="Select Country"
                    error={showInsuranceErrors && !insDest}
                    value={insDest} onChange={setInsDest}
                    options={COUNTRIES.filter(c => c !== insFrom)}
                  />
                </div>

                {/* Row 2 — compact strip: 4 cols */}
                <div style={{ display:'flex', borderRadius:12, overflow:'hidden', marginBottom:18,
                  boxShadow:'0 2px 10px rgba(0,0,0,.05)', border:'1.5px solid #e8e2db' }}>

                  {/* Start Date */}
                  <div style={{ flex:1, padding:'9px 14px', borderRight:'1px solid #e8e2db', background:'#fff' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:3 }}>
                      <span style={{ fontSize:9.5, fontWeight:700, color:'#b0a89e', letterSpacing:'.08em', textTransform:'uppercase' }}>Start Date</span>
                      <span style={{ fontSize:8.5, color:'#c5bdb5' }}>▼</span>
                    </div>
                    <input type="date" value={insStart} onChange={e => setInsStart(e.target.value)}
                      style={{ border:'none', outline:'none', fontSize:13.5, fontWeight:800, color:'#1a1a2e',
                        background:'transparent', fontFamily:'inherit', cursor:'pointer', width:'100%' }} />
                  </div>

                  {/* End Date */}
                  <div style={{ flex:1, padding:'9px 14px', borderRight:'1px solid #e8e2db', background:'#fff' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:3 }}>
                      <span style={{ fontSize:9.5, fontWeight:700, color:'#b0a89e', letterSpacing:'.08em', textTransform:'uppercase' }}>End Date</span>
                      <span style={{ fontSize:8.5, color:'#c5bdb5' }}>▼</span>
                    </div>
                    {insType === 'Annual Multitrip' ? (
                      <div style={{ fontSize:13.5, fontWeight:800, color: insEnd ? '#1a1a2e' : '#d0c8c0' }}>
                        {insEnd ? new Date(insEnd + 'T00:00:00').toLocaleDateString('en-IN',{ day:'2-digit', month:'short', year:'numeric' }) : '—'}
                      </div>
                    ) : (
                      <input type="date" value={insEnd} onChange={e => setInsEnd(e.target.value)}
                        style={{ border:'none', outline:'none', fontSize:13.5, fontWeight:800, color:'#1a1a2e',
                          background:'transparent', fontFamily:'inherit', cursor:'pointer', width:'100%' }} />
                    )}
                  </div>

                  {/* No of Days — auto */}
                  <div style={{ flex:0.65, padding:'9px 14px', borderRight:'1px solid #e8e2db', background:'#f9f7f5' }}>
                    <div style={{ fontSize:9.5, fontWeight:700, color:'#b0a89e', letterSpacing:'.08em',
                      textTransform:'uppercase', marginBottom:3 }}>No Of Days</div>
                    <div style={{ fontSize:13.5, fontWeight:800, color: insNoDays > 0 ? '#1a1a2e' : '#d0c8c0' }}>
                      {insNoDays > 0 ? insNoDays : '—'}
                    </div>
                  </div>

                  {/* No of Persons + inline DOB — single cell */}
                  <div style={{ flex:1.7, padding:'9px 14px', background:'#fff' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:3 }}>
                      <span style={{ fontSize:9.5, fontWeight:700, color:'#b0a89e', letterSpacing:'.08em', textTransform:'uppercase' }}>No of Persons</span>
                      <span style={{ fontSize:8.5, color:'#c5bdb5' }}>▼</span>
                    </div>

                    {insType === 'Individual' ? (
                      <div style={{ fontSize:13.5, fontWeight:800, color:'#1a1a2e', marginBottom:4 }}>1 Passenger</div>
                    ) : insType === 'Annual Multitrip' ? (
                      <div style={{ fontSize:13.5, fontWeight:800, color:'#1a1a2e', marginBottom:4 }}>1 Passenger</div>
                    ) : (
                      <div style={{ fontSize:13.5, fontWeight:800, color:'#1a1a2e', marginBottom:4 }}>
                        {insPersons} Passengers
                      </div>
                    )}

                    {/* DOB — per-traveler popover for Family Floater, single inline field for
                       Individual / Annual Multitrip */}
                    {insType === 'Family Floater' ? (
                      <TravelerPopover countOptions={[2,3,4,5,6]} count={insPersons} onCountChange={setInsPersons}
                        travelers={insTravelers} onChange={setInsTravelers} showRelationship
                        showErrors={showInsuranceErrors} />
                    ) : (
                      <>
                        <input type="date" value={insDob} max={new Date().toISOString().slice(0,10)}
                          onChange={e => setInsDob(e.target.value)}
                          style={{ border:'none', outline:'none', fontSize:13.5, fontWeight:800,
                            color:'#1a1a2e', background:'transparent', fontFamily:'inherit',
                            cursor:'pointer', width:'100%' }} />
                        {!insDob && (
                          showInsuranceErrors ? (
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
                </div>

                {/* Get Quotes button */}
                <div style={{ display:'flex', justifyContent:'flex-end' }}>
                  <button onClick={() => {
                    const valid = Boolean(insType && insFrom && insDest) && (insType === 'Family Floater'
                      ? insTravelers.slice(0, insPersons).every(t => t.dob && t.relationship)
                      : Boolean(insDob));

                    if (!valid) {
                      setShowInsuranceErrors(true);
                      return;
                    }
                    setShowInsuranceErrors(false);

                    const leadDob = insType === 'Family Floater' ? (insTravelers[0]?.dob || '') : insDob;
                    const params = new URLSearchParams({
                      type: insType, dest: insDest, dep: insStart, ret: insEnd,
                      adults: String(insPersons), children: '0', dob: leadDob,
                    });
                    router.push(`/corporate/insurance/plans?${params.toString()}`);
                  }} style={{
                    padding:'13px 44px',
                    background:`linear-gradient(135deg,${O},${O2})`,
                    color:'#fff', border:'none', borderRadius:10,
                    fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit',
                    boxShadow:`0 6px 24px ${O}55`,
                  }}>
                    Get Quotes →
                  </button>
                </div>
              </div>
            ) : (
            /* ── FLIGHT FORM ── */
            <div>
            {/* ── TRIP TYPE PILLS ── */}
            <div style={{ display:'flex', gap:10, marginBottom:28 }}>
              {([['one-way','One-way'],['round','Round-trip'],['multi','Multi-city']] as const).map(([val, lbl]) => {
                const active = trip === val;
                return (
                  <label key={val} onClick={() => setTrip(val)} style={{
                    display:'flex', alignItems:'center', gap:8, cursor:'pointer',
                    padding:'9px 18px',
                    border:`1.5px solid ${active ? O : '#dde0ea'}`,
                    borderRadius:26, fontSize:13.5,
                    color: active ? O : '#888',
                    fontWeight: active ? 600 : 400,
                    userSelect:'none', background:'#fff', transition:'all .15s',
                  }}>
                    <div style={{ width:17, height:17, borderRadius:'50%', flexShrink:0,
                      border:`2.5px solid ${active ? O : '#d0d0d0'}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      background: active ? O : 'transparent', transition:'all .15s' }}>
                      {active && <div style={{ width:7, height:7, borderRadius:'50%', background:'#fff' }} />}
                    </div>
                    {lbl}
                  </label>
                );
              })}
            </div>

            {/* ── SEARCH ROW ── */}
            {trip === 'multi' ? (
              <div style={{ marginBottom:24 }}>
                {legs.map((leg, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10,
                    marginBottom: i < legs.length - 1 ? 14 : 0, flexWrap:'nowrap' }}>
                    <CityField label="FROM" flex={2.2}
                      value={leg.from} onChange={(v, opt) => updateLegCity(i,'from',v,opt?.countryCode)} placeholder="Enter City"
                      error={showFlightErrors && !leg.from.trim()} />
                    <button onClick={() => swapLeg(i)} style={{
                      width:34, height:34, borderRadius:'50%', flexShrink:0,
                      background:'#fff', border:`2px solid ${O}`, color:O,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      cursor:'pointer', fontSize:18, marginTop:6,
                      boxShadow:`0 2px 10px ${O}33`,
                    }}>↺</button>
                    <CityField label="TO" flex={2.2}
                      value={leg.to} onChange={(v, opt) => updateLegCity(i,'to',v,opt?.countryCode)} placeholder="Enter City"
                      error={showFlightErrors && !leg.to.trim()} />
                    <FloatField label="DEPARTURE" flex={1.6}
                      value={leg.dep} onChange={v => updateLeg(i,'dep',v)} placeholder="" O={O} type="date" min={todayStr}
                      error={showFlightErrors && !leg.dep.trim()} />
                    {i === 0
                      ? <TravellersField flex={2} O={O} O2={O2} value={travellers} onChange={setTravellers} />
                      : <button onClick={() => removeLeg(i)} style={{
                          width:34, height:34, borderRadius:'50%', flexShrink:0, marginTop:6,
                          background:'#fee2e2', border:'none', color:'#c9184a',
                          cursor:'pointer', fontSize:20, fontWeight:700, lineHeight:'1',
                          display:'flex', alignItems:'center', justifyContent:'center',
                        }}>×</button>
                    }
                  </div>
                ))}
                <div style={{ marginTop:18 }}>
                  <button onClick={addLeg} style={{
                    display:'inline-flex', alignItems:'center', gap:7,
                    padding:'9px 20px', border:`1.5px solid ${O}`,
                    borderRadius:26, background:'#fff', color:O,
                    cursor:'pointer', fontSize:13.5, fontWeight:600, fontFamily:'inherit',
                  }}>
                    + Add City
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24, flexWrap:'nowrap' }}>
                <CityField label="FROM" flex={2.2}
                  value={from} onChange={(v, opt) => { setFrom(v); setFromCountry(opt?.countryCode ?? ''); }} placeholder="Enter City"
                  error={showFlightErrors && !from.trim()} />
                <button onClick={swap} style={{
                  width:34, height:34, borderRadius:'50%', flexShrink:0,
                  background:'#fff', border:`2px solid ${O}`, color:O,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  cursor:'pointer', fontSize:18, marginTop:6,
                  boxShadow:`0 2px 10px ${O}33`, transition:'transform .15s',
                }}>↺</button>
                <CityField label="TO" flex={2.2}
                  value={to} onChange={(v, opt) => { setTo(v); setToCountry(opt?.countryCode ?? ''); }} placeholder="Enter City"
                  error={showFlightErrors && !to.trim()} />
                <FloatField label="DEPARTURE" flex={1.6}
                  value={dep} onChange={setDep} placeholder="" O={O} type="date" min={todayStr}
                  error={showFlightErrors && !dep.trim()} />
                {trip === 'round' && (
                  <FloatField label="RETURN" flex={1.6}
                    value={ret} onChange={setRet} placeholder="" O={O} type="date" min={dep || todayStr}
                    error={showFlightErrors && !ret.trim()} />
                )}
                <TravellersField flex={2} O={O} O2={O2} value={travellers} onChange={setTravellers} />
              </div>
            )}

            {/* ── FARE TYPE + SEARCH ── */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>

              {/* Fare type */}
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <span style={{ fontSize:13.5, fontWeight:700, color:'#1a1a2e' }}>Fare Type:</span>
                <div style={{
                  display:'flex', alignItems:'center', gap:9,
                  padding:'9px 22px',
                  background:`linear-gradient(135deg,${O},${O2})`,
                  color:'#fff', borderRadius:28,
                  fontSize:13.5, fontWeight:700,
                  boxShadow:`0 3px 12px ${O}44`,
                  cursor:'default',
                }}>
                  {/* radio indicator */}
                  <div style={{ width:14, height:14, borderRadius:'50%', border:'2.5px solid rgba(255,255,255,.9)',
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <div style={{ width:5, height:5, borderRadius:'50%', background:'#fff' }} />
                  </div>
                  Regular
                </div>
              </div>

              {/* Search button */}
              <button onClick={handleSearchFlights} style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'14px 38px',
                background:`linear-gradient(135deg,${O} 0%,${O2} 100%)`,
                color:'#fff', border:'none', borderRadius:12,
                fontSize:15, fontWeight:800, cursor:'pointer',
                letterSpacing:'.01em',
                boxShadow:`0 6px 24px ${O}55`,
                transition:'transform .15s, box-shadow .15s',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                Search Flights
              </button>
            </div>
            </div>
            )}
          </div>
        </div>
      </main>

      <CorpFooter />
    </div>
  );
}
