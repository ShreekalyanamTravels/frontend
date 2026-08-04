'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Inter } from 'next/font/google';
import DashNav from '../components/DashNav';
import CorpFooter from '../components/CorpFooter';
import { useCurrentUser } from '../../hooks/useCurrentUser';

const inter = Inter({ subsets:['latin'], weight:['400','500','600','700','800'] });
const O = '#f07820';

type Product   = 'flights' | 'hotels' | 'travel' | 'visa' | 'insurance';
type StatusTab = 'upcoming' | 'completed' | 'canceled';
type TktStatus = 'Ticketed' | 'Pending' | 'Cancelled' | 'Refunded' | 'On Hold';
type TripType  = 'one-way' | 'round' | 'multi';
type InsStatus = 'Active' | 'Expired' | 'Cancelled' | 'Claim Pending';

interface Sector { num:number; route:string; date:string; pnr:string; status:TktStatus; }
interface Booking {
  id:string; ref:string; type:TripType; tab:StatusTab; product:Product;
  bookedOn:string; passengers:string[]; sectors:Sector[];
}
interface InsuranceBooking {
  id:string; ref:string; tab:StatusTab; bookedOn:string;
  policyNo:string; provider:string; planType:string;
  insured:string[]; coverFrom:string; coverTo:string;
  sumInsured:string; coverageItems:{label:string;amount:string}[];
  premium:string; status:InsStatus;
}


const STATUS_COLOR: Record<TktStatus,{color:string;bg:string}> = {
  Ticketed:  { color:'#2d8a4e', bg:'#e8f5e9' },
  Pending:   { color:'#e57c00', bg:'#fff8e1' },
  Cancelled: { color:'#c9184a', bg:'#fce4ec' },
  Refunded:  { color:'#1565c0', bg:'#e3f2fd' },
  'On Hold': { color:'#6a1b9a', bg:'#f3e5f5' },
};

const INS_STATUS_COLOR: Record<InsStatus,{color:string;bg:string}> = {
  Active:          { color:'#2d8a4e', bg:'#e8f5e9' },
  Expired:         { color:'#777',    bg:'#f0f0f0' },
  Cancelled:       { color:'#c9184a', bg:'#fce4ec' },
  'Claim Pending': { color:'#e57c00', bg:'#fff8e1' },
};

const INS_TYPE_ICON: Record<string,string> = {
  'Travel Insurance':  '✈',
  'Medical Insurance': '♥',
  'Trip Cancellation': '⛔',
  'International Travel Insurance': '✈',
};
function insTypeIcon(t: string): string {
  return INS_TYPE_ICON[t] ?? '🛡️';
}

function bookingStatus(b: Booking): TktStatus {
  const ss = b.sectors.map(s => s.status);
  if (ss.every(s => s === 'Ticketed'))  return 'Ticketed';
  if (ss.every(s => s === 'Cancelled')) return 'Cancelled';
  if (ss.every(s => s === 'Refunded'))  return 'Refunded';
  if (ss.some(s => s === 'On Hold'))    return 'On Hold';
  return 'Pending';
}

type ProductInfo = { status:'active'|'inactive'; availability:'live'|'coming_soon' };

export default function MyBookingsPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useCurrentUser();
  const [product,   setProduct]   = useState<Product>('flights');
  const [statusTab, setStatusTab] = useState<StatusTab>('upcoming');
  const [search,    setSearch]    = useState('');
  const [dateFrom,  setDateFrom]  = useState('');
  const [dateTo,    setDateTo]    = useState('');
  const [selStatus, setSelStatus] = useState<Set<TktStatus>>(new Set());
  const [BOOKINGS,  setBookings]  = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  // Product tabs — dynamic, driven by the `products` table status (mirrors the dashboard).
  const [productStatus, setProductStatus] = useState<Record<string, ProductInfo>>({
    flight:    { status:'active', availability:'live' },
    insurance: { status:'active', availability:'live' },
    hotels:    { status:'active', availability:'coming_soon' },
    travel:    { status:'active', availability:'coming_soon' },
    visa:      { status:'active', availability:'coming_soon' },
  });
  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        const map: Record<string, ProductInfo> = {};
        (data.products || []).forEach((p: { name:string; status:'active'|'inactive'; availability:'live'|'coming_soon' }) => {
          map[p.name.toLowerCase()] = { status: p.status, availability: p.availability };
        });
        setProductStatus(prev => ({ ...prev, ...map }));
      });
  }, []);

  useEffect(() => {
    if (!userLoading && !user) router.push('/');
  }, [userLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    fetch('/api/bookings')
      .then(res => res.json())
      .then((data: { bookings?: Booking[] }) => setBookings(data.bookings ?? []))
      .finally(() => setBookingsLoading(false));
  }, [user]);

  const [INS_BOOKINGS, setInsBookings] = useState<InsuranceBooking[]>([]);
  const [insBookingsLoading, setInsBookingsLoading] = useState(true);
  useEffect(() => {
    if (!user) return;
    fetch('/api/insurance/bookings')
      .then(res => res.json())
      .then((data: { bookings?: InsuranceBooking[] }) => setInsBookings(data.bookings ?? []))
      .finally(() => setInsBookingsLoading(false));
  }, [user]);

  function toggleStatus(s: TktStatus) {
    setSelStatus(p => { const n = new Set(p); n.has(s) ? n.delete(s) : n.add(s); return n; });
  }
  function clearAll() { setSearch(''); setDateFrom(''); setDateTo(''); setSelStatus(new Set()); }

  const filtered = BOOKINGS.filter(b => {
    if (b.product !== product || b.tab !== statusTab) return false;
    if (selStatus.size > 0 && !b.sectors.some(s => selStatus.has(s.status))) return false;
    if (search) {
      const q = search.toLowerCase();
      return b.ref.toLowerCase().includes(q) ||
        b.passengers.some(p => p.toLowerCase().includes(q)) ||
        b.sectors.some(s => s.pnr.toLowerCase().includes(q) || s.route.toLowerCase().includes(q));
    }
    return true;
  });

  const filteredIns = INS_BOOKINGS.filter(b => {
    if (b.tab !== statusTab) return false;
    if (search) {
      const q = search.toLowerCase();
      return b.ref.toLowerCase().includes(q) ||
        b.policyNo.toLowerCase().includes(q) ||
        b.insured.some(p => p.toLowerCase().includes(q)) ||
        b.provider.toLowerCase().includes(q);
    }
    return true;
  });

  const hasFilters = search || dateFrom || dateTo || selStatus.size > 0;
  const isIns = product === 'insurance';

  return (
    <div className={inter.className} style={{ background:'#f7f3ef', minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      <DashNav title="My Bookings" />

      <main style={{ flex:1, padding:'24px 3% 60px', display:'flex', flexDirection:'column' }}>

        {/* Product tabs — dynamic, driven by the `products` table status */}
        <div style={{ display:'flex', gap:8, marginBottom:18 }}>
          {([
            { key:'flight',    tab:'flights'   as Product, label:'Flights',   icon:'✈' },
            { key:'insurance', tab:'insurance' as Product, label:'Insurance', icon:'\u{1F6E1}' },
            { key:'hotels',    tab:'hotels'    as Product, label:'Hotels',    icon:'\u{1F3E8}' },
            { key:'travel',    tab:'travel'    as Product, label:'Travel',    icon:'\u{1F9F3}' },
            { key:'visa',      tab:'visa'      as Product, label:'Visa',      icon:'\u{1F310}' },
          ]).filter(t => productStatus[t.key]?.status === 'active').map(t => {
            const info = productStatus[t.key];
            const enabled = info?.status === 'active' && info?.availability === 'live';
            const isActive = product === t.tab;
            return (
              <button key={t.key} onClick={() => { if (enabled) { setProduct(t.tab); setStatusTab('upcoming'); } }} style={{
                display:'flex', alignItems:'center', gap:6, padding:'8px 18px', borderRadius:22,
                border: isActive ? 'none' : '1.5px solid #e0d8d0',
                background: isActive ? `linear-gradient(135deg,${O},#e86d18)` : '#fff',
                color: isActive ? '#fff' : '#888',
                fontSize:13.5, fontWeight:700, cursor: enabled ? 'pointer' : 'default',
                fontFamily:'inherit', opacity: enabled ? 1 : 0.7,
                boxShadow: isActive ? `0 4px 12px ${O}44` : 'none',
              }}>
                {t.icon} {t.label}
                {!enabled && (
                  <span style={{ fontSize:10, background: isActive ? 'rgba(255,255,255,.3)' : O,
                    color:'#fff', padding:'2px 7px', borderRadius:10 }}>Soon</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Status tabs */}
        <div style={{ display:'flex', borderBottom:'2px solid #ede7e0', marginBottom:20 }}>
          {([
            { key:'upcoming',  label:'Upcoming'  },
            { key:'completed', label:'Completed' },
            { key:'canceled',  label:'Canceled'  },
          ] as { key:StatusTab; label:string }[]).map(t => {
            const cnt = isIns
              ? INS_BOOKINGS.filter(b => b.tab === t.key).length
              : BOOKINGS.filter(b => b.tab === t.key && b.product === product).length;
            return (
              <button key={t.key} onClick={() => setStatusTab(t.key)} style={{
                display:'flex', alignItems:'center', gap:6, padding:'9px 20px',
                background:'none', border:'none',
                borderBottom: statusTab === t.key ? `2.5px solid ${O}` : '2.5px solid transparent',
                marginBottom:'-2px', cursor:'pointer', fontFamily:'inherit',
                color: statusTab === t.key ? O : '#888',
                fontSize:13.5, fontWeight: statusTab === t.key ? 700 : 500,
              }}>
                {t.label}
                <span style={{
                  fontSize:11, fontWeight:700, minWidth:18, height:18, borderRadius:9, padding:'0 5px',
                  background: statusTab === t.key ? O : '#ede7e0',
                  color: statusTab === t.key ? '#fff' : '#999',
                  display:'inline-flex', alignItems:'center', justifyContent:'center',
                }}>{cnt}</span>
              </button>
            );
          })}
        </div>

        {/* Sidebar + Cards */}
        <div style={{ display:'flex', gap:20, flex:1 }}>

          {/* SIDEBAR */}
          <aside style={{
            width:236, flexShrink:0, background:'#fff', borderRadius:10,
            boxShadow:'0 2px 10px rgba(0,0,0,.07)', padding:'18px 16px',
            alignSelf:'flex-start', position:'sticky', top:20,
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <span style={{ fontSize:13.5, fontWeight:800, color:'#1a1a2e' }}>Filters</span>
              {hasFilters && (
                <button onClick={clearAll} style={{ fontSize:11.5, color:O, fontWeight:600,
                  background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', padding:0 }}>
                  Clear All
                </button>
              )}
            </div>

            {/* Search */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:10.5, fontWeight:700, color:'#bbb', letterSpacing:'.08em',
                textTransform:'uppercase', marginBottom:6 }}>Search</div>
              <div style={{ position:'relative' }}>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder={isIns ? 'Policy No, Name...' : 'PNR, Ref, Name...'}
                  style={{ width:'100%', padding:'7px 8px 7px 10px', border:'1.5px solid #e8e2db',
                    borderRadius:7, fontSize:12.5, fontFamily:'inherit', color:'#333',
                    outline:'none', boxSizing:'border-box' }} />
              </div>
            </div>

            {/* Date range */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:10.5, fontWeight:700, color:'#bbb', letterSpacing:'.08em',
                textTransform:'uppercase', marginBottom:6 }}>{isIns ? 'Cover Date' : 'Travel Date'}</div>
              {[['From', dateFrom, setDateFrom], ['To', dateTo, setDateTo]].map(([lbl, val, set]) => (
                <div key={lbl as string} style={{ marginBottom:6 }}>
                  <div style={{ fontSize:11, color:'#bbb', marginBottom:3 }}>{lbl as string}</div>
                  <input type="date" value={val as string}
                    onChange={e => (set as (v:string)=>void)(e.target.value)}
                    style={{ width:'100%', padding:'7px 8px', border:'1.5px solid #e8e2db', borderRadius:7,
                      fontSize:12.5, fontFamily:'inherit', color:'#333', outline:'none', boxSizing:'border-box' }} />
                </div>
              ))}
            </div>

            {/* Status filter */}
            {!isIns && (
              <div>
                <div style={{ fontSize:10.5, fontWeight:700, color:'#bbb', letterSpacing:'.08em',
                  textTransform:'uppercase', marginBottom:8 }}>Status</div>
                {(['Ticketed','Pending','On Hold','Cancelled','Refunded'] as TktStatus[]).map(s => (
                  <label key={s} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0', cursor:'pointer' }}>
                    <input type="checkbox" checked={selStatus.has(s)} onChange={() => toggleStatus(s)}
                      style={{ accentColor:O, width:13, height:13, cursor:'pointer' }} />
                    <span style={{ fontSize:13, color: selStatus.has(s) ? O : '#555',
                      fontWeight: selStatus.has(s) ? 600 : 400, flex:1 }}>{s}</span>
                    <span style={{ fontSize:11, fontWeight:700,
                      color: STATUS_COLOR[s].color, background: STATUS_COLOR[s].bg,
                      padding:'1px 7px', borderRadius:9 }}>
                      {BOOKINGS.filter(b => b.sectors.some(x => x.status === s)).length}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* Insurance status filter */}
            {isIns && (
              <div>
                <div style={{ fontSize:10.5, fontWeight:700, color:'#bbb', letterSpacing:'.08em',
                  textTransform:'uppercase', marginBottom:8 }}>Status</div>
                {(['Active','Claim Pending','Expired','Cancelled'] as InsStatus[]).map(s => (
                  <div key={s} style={{ display:'flex', justifyContent:'space-between',
                    alignItems:'center', padding:'5px 0' }}>
                    <span style={{ fontSize:13, color:'#555' }}>{s}</span>
                    <span style={{ fontSize:11, fontWeight:700,
                      color: INS_STATUS_COLOR[s].color, background: INS_STATUS_COLOR[s].bg,
                      padding:'1px 7px', borderRadius:9 }}>
                      {INS_BOOKINGS.filter(b => b.status === s).length}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </aside>

          {/* CARDS */}
          <div style={{ flex:1, minWidth:0 }}>

            {/* ── FLIGHT cards ── */}
            {!isIns && (
              bookingsLoading ? (
                <div style={{ textAlign:'center', padding:'50px 20px', background:'#fff',
                  borderRadius:10, color:'#bbb', fontSize:14 }}>
                  Loading bookings…
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ textAlign:'center', padding:'50px 20px', background:'#fff',
                  borderRadius:10, color:'#bbb', fontSize:14 }}>
                  <div style={{ fontSize:36, marginBottom:10 }}>No bookings found.</div>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  {filtered.map(b => {
                    const bStatus = bookingStatus(b);
                    return (
                      <div key={b.id} style={{ border:'1px solid #e8d5b8', borderRadius:10, overflow:'hidden', background:'#fff' }}>
                        <div style={{ display:'flex' }}>
                          {/* LEFT */}
                       
                          <div style={{ flex:1, borderRight:'1px solid #f0e4d0' }}>
                            <div style={{ padding:'11px 16px', fontWeight:700, fontSize:14,
                              color:'#1a1a2e', borderBottom:'1px solid #f0e4d0' }}>
                              {b.passengers[0]}
                            </div>
                            <div style={{ padding:'4px 16px 10px' }}>
                              {b.passengers.map((p, i) => (
                                <div key={i} style={{ display:'flex', alignItems:'center', gap:8,
                                  padding:'7px 0', fontSize:13.5,
                                  borderBottom: i < b.passengers.length - 1 ? '1px solid #f5f0ee' : 'none' }}>
                                  <span style={{ color:'#aaa', minWidth:18 }}>{i + 1}.</span>
                                  <span style={{ flex:1, color:'#444' }}>{p}</span>
                                  <span style={{ color:'#888', fontSize:12.5 }}>
                                    {b.sectors[0].date}
                                    {b.sectors.length > 1 && <span style={{ color:'#ccc', margin:'0 5px' }}>—</span>}
                                    {b.sectors.length > 1 && b.sectors[b.sectors.length - 1].date}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div style={{ padding:'10px 16px', display:'flex', gap:8, flexWrap:'wrap' }}>
                              <a href={`/api/bookings/${encodeURIComponent(b.ref)}/invoice`} target="_blank" rel="noopener noreferrer" style={{ padding:'6px 18px', border:'1.5px solid #2563eb',
                                borderRadius:20, background:'#fff', color:'#2563eb', textDecoration:'none',
                                fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'inline-block' }}>Invoice</a>
                              {bStatus === 'Ticketed' && (statusTab === 'upcoming' || statusTab === 'completed') && (
                                <a href={`/api/bookings/${encodeURIComponent(b.ref)}/ticket`} target="_blank" rel="noopener noreferrer" style={{
                                  padding:'6px 18px', border:'1.5px solid #e0a458',
                                  borderRadius:20, background:'#fdf1e0', color:'#a8701f', textDecoration:'none',
                                  fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'inline-block' }}>
                                  {b.sectors.length <= 1
                                    ? `Print (${b.sectors[0]?.route ?? ''})`
                                    : `Print Ticket (${b.sectors.map(s => s.route).join(' / ')})`}
                                </a>
                              )}
                              {statusTab === 'upcoming' && bStatus !== 'Cancelled' && bStatus !== 'Refunded' && (
                                <button onClick={() => router.push(`/corporate/my-bookings/change-request?ref=${encodeURIComponent(b.ref)}`)} style={{
                                  padding:'6px 18px', border:'1.5px solid #16a34a',
                                  borderRadius:20, background:'#fff', color:'#16a34a',
                                  fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                                  display:'flex', alignItems:'center', gap:5 }}>
                                  ⇄ Change Request
                                </button>
                              )}
                            </div>
                          </div>
                          {/* RIGHT */}
                          <div style={{ width:210, flexShrink:0, background:'#fdf6ec',
                            padding:'14px 16px', display:'flex', flexDirection:'column', gap:10 }}>
                            <div style={{ fontSize:13.5, color:'#444' }}>
                              <span style={{ color:'#888' }}>Ref No.: </span>
                              <span style={{ fontWeight:600, color:'#1a1a2e' }}>{b.ref}</span>
                            </div>
                            <div style={{ fontSize:13.5 }}>
                              <span style={{ color:'#888' }}>Status: </span>
                              <span style={{ fontWeight:700, color: STATUS_COLOR[bStatus].color }}>{bStatus}</span>
                            </div>
                          </div>
                        </div>
                        {/* Footer inside box */}
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                          padding:'9px 16px', borderTop:'1px solid #f0e4d0', background:'#fdfaf7' }}>
                          <span style={{ fontSize:12.5, color:'#888' }}>
                            <span style={{ fontWeight:700, color:'#555' }}>Booked On : </span>{b.bookedOn}
                          </span>
                          <div style={{ display:'flex', gap:8 }}>
                            <button style={{ padding:'5px 14px', border:'1.5px solid #25D366',
                              borderRadius:7, background:'#fff', color:'#25D366',
                              fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                              WhatsApp
                            </button>
                            <button onClick={() => router.push(`/corporate/booking-confirmation?ref=${encodeURIComponent(b.ref)}`)} style={{ padding:'5px 18px',
                              background:`linear-gradient(135deg,${O},#e86d18)`,
                              color:'#fff', border:'none', borderRadius:7,
                              fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                              Open
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* ── INSURANCE cards ── */}
            {isIns && (
              insBookingsLoading ? (
                <div style={{ textAlign:'center', padding:'50px 20px', background:'#fff',
                  borderRadius:10, color:'#bbb', fontSize:14 }}>
                  Loading insurance policies…
                </div>
              ) : filteredIns.length === 0 ? (
                <div style={{ textAlign:'center', padding:'50px 20px', background:'#fff',
                  borderRadius:10, color:'#bbb', fontSize:14 }}>
                  No insurance bookings found.
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  {filteredIns.map(b => (
                    <div key={b.id} style={{ border:'1px solid #e8d5b8', borderRadius:10, overflow:'hidden', background:'#fff' }}>
                      <div style={{ display:'flex' }}>

                        {/* LEFT card */}
                        <div style={{ flex:1, borderRight:'1px solid #f0e4d0' }}>

                          {/* Header */}
                          <div style={{ padding:'11px 16px', borderBottom:'1px solid #f0e4d0',
                            display:'flex', alignItems:'center', gap:10 }}>
                            <div style={{ fontSize:18 }}>{insTypeIcon(b.planType)}</div>
                            <div style={{ flex:1 }}>
                              <div style={{ fontWeight:700, fontSize:14, color:'#1a1a2e' }}>{b.insured[0]}</div>
                              <div style={{ fontSize:12, color:'#aaa', marginTop:1 }}>{b.planType} &middot; {b.provider}</div>
                            </div>
                          </div>

                          {/* Insured persons */}
                          <div style={{ padding:'4px 16px 10px' }}>
                            {b.insured.map((p, i) => (
                              <div key={i} style={{ display:'flex', alignItems:'center', gap:8,
                                padding:'7px 0', fontSize:13.5,
                                borderBottom: i < b.insured.length - 1 ? '1px solid #f5f0ee' : 'none' }}>
                                <span style={{ color:'#aaa', minWidth:18 }}>{i + 1}.</span>
                                <span style={{ flex:1, color:'#444' }}>{p}</span>
                                <span style={{ color:'#888', fontSize:12.5 }}>
                                  {b.coverFrom} &mdash; {b.coverTo}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Details row */}
                          <div style={{ padding:'8px 16px', background:'#faf7f5',
                            display:'flex', gap:24, borderTop:'1px solid #f0e8e0' }}>
                            <div>
                              <div style={{ fontSize:10.5, color:'#bbb', fontWeight:700,
                                letterSpacing:'.07em', textTransform:'uppercase', marginBottom:2 }}>Total Coverage</div>
                              <div style={{ fontSize:13.5, fontWeight:700, color:'#1a1a2e' }}>{b.sumInsured}</div>
                            </div>
                            <div>
                              <div style={{ fontSize:10.5, color:'#bbb', fontWeight:700,
                                letterSpacing:'.07em', textTransform:'uppercase', marginBottom:2 }}>Premium</div>
                              <div style={{ fontSize:13.5, fontWeight:700, color:O }}>Rs. {b.premium}</div>
                            </div>
                            <div>
                              <div style={{ fontSize:10.5, color:'#bbb', fontWeight:700,
                                letterSpacing:'.07em', textTransform:'uppercase', marginBottom:2 }}>Travel Period</div>
                              <div style={{ fontSize:13, color:'#555' }}>{b.coverFrom} &ndash; {b.coverTo}</div>
                            </div>
                          </div>

                          {/* Coverage breakdown */}
                          {b.coverageItems.length > 0 && (
                            <div style={{ padding:'8px 16px 10px', background:'#faf7f5',
                              display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                              {b.coverageItems.map(c => (
                                <div key={c.label} style={{ display:'flex', justifyContent:'space-between',
                                  alignItems:'center', background:'#fff', border:'1px solid #f0e4d0',
                                  borderRadius:6, padding:'4px 10px' }}>
                                  <span style={{ fontSize:11.5, color:'#888' }}>{c.label}</span>
                                  <span style={{ fontSize:12, fontWeight:700, color:'#555' }}>{c.amount}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Buttons */}
                          <div style={{ padding:'10px 16px', display:'flex', gap:8 }}>
                            <a href={`/api/insurance/${encodeURIComponent(b.ref)}/pdf`} target="_blank" rel="noopener noreferrer"
                              style={{ padding:'5px 16px', border:`1.5px solid ${O}`,
                              borderRadius:7, background:'#fff', color:O, textDecoration:'none',
                              fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                              Download Policy
                            </a>
                            <a href={`/api/insurance/${encodeURIComponent(b.ref)}/invoice`} target="_blank" rel="noopener noreferrer"
                              style={{ padding:'5px 16px', border:'1.5px solid #d0c4b0',
                              borderRadius:7, background:'#fff', color:'#777', textDecoration:'none',
                              fontSize:12.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                              Invoice
                            </a>
                          </div>
                        </div>

                        {/* RIGHT card */}
                        <div style={{ width:210, flexShrink:0, background:'#fdf6ec',
                          padding:'14px 16px', display:'flex', flexDirection:'column', gap:12 }}>
                          <div>
                            <div style={{ fontSize:10.5, color:'#bbb', fontWeight:700,
                              letterSpacing:'.07em', textTransform:'uppercase', marginBottom:4 }}>Policy No.</div>
                            <div style={{ fontSize:12.5, fontWeight:700, color:'#1a1a2e',
                              wordBreak:'break-all', lineHeight:1.4 }}>{b.policyNo}</div>
                          </div>
                          <div>
                            <div style={{ fontSize:10.5, color:'#bbb', fontWeight:700,
                              letterSpacing:'.07em', textTransform:'uppercase', marginBottom:4 }}>Ref No.</div>
                            <div style={{ fontSize:13, fontWeight:600, color:'#555' }}>{b.ref}</div>
                          </div>
                          <div>
                            <div style={{ fontSize:10.5, color:'#bbb', fontWeight:700,
                              letterSpacing:'.07em', textTransform:'uppercase', marginBottom:5 }}>Status</div>
                            <span style={{ fontSize:12.5, fontWeight:800,
                              color: INS_STATUS_COLOR[b.status].color,
                              background: INS_STATUS_COLOR[b.status].bg,
                              padding:'4px 12px', borderRadius:12 }}>
                              {b.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Footer inside box */}
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                        padding:'9px 16px', borderTop:'1px solid #f0e4d0', background:'#fdfaf7' }}>
                        <span style={{ fontSize:12.5, color:'#888' }}>
                          <span style={{ fontWeight:700, color:'#555' }}>Booked On : </span>{b.bookedOn}
                        </span>
                        <div style={{ display:'flex', gap:8 }}>
                          <button style={{ padding:'5px 14px', border:'1.5px solid #25D366',
                            borderRadius:7, background:'#fff', color:'#25D366',
                            fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                            WhatsApp
                          </button>
                          <button style={{ padding:'5px 18px',
                            background:`linear-gradient(135deg,${O},#e86d18)`,
                            color:'#fff', border:'none', borderRadius:7,
                            fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                            Open
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </main>

      <CorpFooter />
    </div>
  );
}
