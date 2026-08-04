'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Inter, Playfair_Display } from 'next/font/google';
import BookingProgress from '../components/BookingProgress';

const inter    = Inter({ subsets:['latin'], weight:['400','500','600','700','800'] });
const playfair = Playfair_Display({ subsets:['latin'], weight:['700'], style:['italic'] });

const O  = '#f07820';
const O2 = '#e86d18';
const PK = '#c9184a';

type Tab = 'flight'|'fare'|'cancel'|'datechange';

const TABS: { id: Tab; label: string }[] = [
  { id:'flight',     label:'Flight Details'  },
  { id:'fare',       label:'Fare Summary'    },
  { id:'cancel',     label:'Cancellation'    },
  { id:'datechange', label:'Date Change'     },
];

const FLIGHT = {
  airline:'IndiGo', code:'6E-6492', color:'#003580',
  dep:'17:15', depAirport:'Jaipur (T-2)', depCity:'Jaipur',
  arr:'18:20', arrAirport:'New Delhi (T-1)', arrCity:'New Delhi',
  dur:'01 h 05 m', stops:'Non Stop', aircraft:'Airbus A320',
  class:'Economy', price:3279, baseFare:2800, surcharges:629, discount:150,
};

function Divider() {
  return <div style={{ height:1, background:'#f0e8e8', margin:'0 0 24px' }} />;
}

function ColHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize:10.5, fontWeight:700, color:PK,
      textTransform:'uppercase', letterSpacing:'.09em' }}>{children}</div>
  );
}

export default function FlightDetailsPage() {
  const [tab, setTab] = useState<Tab>('flight');

  return (
    <div className={inter.className} style={{ background:'#fdf6f2', minHeight:'100vh', display:'flex', flexDirection:'column' }}>

      {/* ─── NAVBAR ─── */}
      <nav style={{
        background:'linear-gradient(90deg,#111 0%,#1e1e1e 100%)',
        padding:'0 5%', display:'flex', alignItems:'center',
        justifyContent:'space-between', height:58, flexShrink:0,
        boxShadow:'0 2px 12px rgba(0,0,0,.4)',
      }}>
        <Link href="/corporate/login" style={{ display:'flex', alignItems:'center', gap:9, textDecoration:'none' }}>
          <span style={{ fontSize:24 }}>🪷</span>
          <span className={playfair.className} style={{ fontSize:21, fontWeight:700, color:PK, fontStyle:'italic' }}>
            Kalyanam
          </span>
        </Link>
        <Link href="/corporate/results" style={{
          fontSize:13, color:'rgba(255,255,255,.7)', textDecoration:'none', fontWeight:500,
        }}>
          ← Back to Results
        </Link>
      </nav>

      {/* ─── BOOKING PROGRESS ─── */}
      <div style={{ padding:'18px 0 0' }}>
        <BookingProgress step={2} />
      </div>

      {/* ─── FARE HEADER BAR ─── */}
      <div style={{ background:'#fff', borderBottom:'1px solid #f0e8e8',
        boxShadow:'0 2px 10px rgba(0,0,0,.05)', margin:'0 5%',
        borderRadius:'0 0 14px 14px', padding:'18px 28px',
        display:'flex', alignItems:'center', justifyContent:'space-between', gap:24 }}>
        {/* Left: title + trip meta */}
        <div>
          <div style={{ fontSize:20, fontWeight:800, color:'#1a1a2e', marginBottom:5 }}>
            Flight Details
          </div>
          <div style={{ fontSize:12.5, color:'#aaa', display:'flex', gap:8, alignItems:'center' }}>
            <span>One Way</span><span style={{ color:'#ddd' }}>·</span>
            <span>{FLIGHT.class}</span><span style={{ color:'#ddd' }}>·</span>
            <span>1 Traveller</span><span style={{ color:'#ddd' }}>·</span>
            <span>Wed, 1 Jul</span>
          </div>
        </div>

        {/* Right: fare badge + price + book now */}
        <div style={{ display:'flex', alignItems:'center', gap:16, flexShrink:0 }}>
          {/* Fare badge */}
          <div style={{ textAlign:'right' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, marginBottom:4 }}>
              <span style={{ fontSize:10.5, fontWeight:800, letterSpacing:'.1em',
                textTransform:'uppercase', color:PK, background:'#fce8ee',
                padding:'3px 10px', borderRadius:12 }}>SAVER</span>
              <span style={{ fontSize:22, fontWeight:800, color:O }}>
                ₹{FLIGHT.price.toLocaleString()}
              </span>
            </div>
            <div style={{ fontSize:11.5, color:'#aaa', textAlign:'right' }}>
              Offer price{' '}
              <span style={{ color:O, fontWeight:700 }}>
                ₹{(FLIGHT.price - 22).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Book Now */}
          <button style={{
            padding:'13px 28px',
            background:`linear-gradient(135deg,${O},${O2})`,
            color:'#fff', border:'none', borderRadius:10,
            fontSize:14, fontWeight:800, cursor:'pointer',
            fontFamily:'inherit', letterSpacing:'.03em',
            boxShadow:`0 4px 14px ${O}55`,
            whiteSpace:'nowrap',
          }}>
            BOOK NOW
          </button>
        </div>
      </div>

      {/* ─── TAB BAR ─── */}
      <div style={{ background:'#fef8f2', borderBottom:'2px solid #f0e8e8', margin:'0 5%' }}>
        <div style={{ display:'flex' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex:1, padding:'14px 10px',
              background:'transparent',
              color: tab === t.id ? O : '#999',
              border:'none', cursor:'pointer',
              fontSize:13.5, fontWeight: tab === t.id ? 700 : 500,
              fontFamily:'inherit', letterSpacing:'.01em',
              borderBottom: tab === t.id ? `3px solid ${O}` : '3px solid transparent',
              marginBottom:-2,
              transition:'all .18s',
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── CONTENT ─── */}
      <main style={{ flex:1, padding:'28px 5%', margin:'0', width:'100%', boxSizing:'border-box' }}>

        {/* ── FLIGHT DETAILS ── */}
        {tab === 'flight' && (
          <div style={{ background:'#fff', borderRadius:14, padding:'28px 32px',
            boxShadow:'0 2px 16px rgba(0,0,0,.06)', border:'1px solid #f0e8e8' }}>

            {/* Route heading */}
            <div style={{ fontSize:14, fontWeight:700, color:PK, marginBottom:18 }}>
              {FLIGHT.depCity} To {FLIGHT.arrCity}
            </div>
            <Divider />

            {/* Flight card */}
            <div style={{ display:'flex', alignItems:'center', gap:20 }}>
              <div style={{ width:52, height:52, borderRadius:12, background:FLIGHT.color,
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                boxShadow:`0 4px 14px ${FLIGHT.color}55` }}>
                <span style={{ color:'#fff', fontSize:13, fontWeight:800 }}>6E</span>
              </div>

              <div style={{ minWidth:110 }}>
                <div style={{ fontSize:15, fontWeight:700, color:'#1a1a2e' }}>{FLIGHT.airline}</div>
                <div style={{ fontSize:12, color:'#bbb', marginTop:3 }}>{FLIGHT.code}</div>
              </div>

              <div style={{ textAlign:'right', minWidth:90 }}>
                <div style={{ fontSize:24, fontWeight:800, color:'#1a1a2e' }}>{FLIGHT.dep}</div>
                <div style={{ fontSize:12, color:'#aaa', marginTop:4 }}>{FLIGHT.depAirport}</div>
              </div>

              <div style={{ flex:1, textAlign:'center', padding:'0 16px' }}>
                <div style={{ fontSize:14, fontWeight:700, color:'#555', marginBottom:10 }}>{FLIGHT.dur}</div>
                <div style={{ display:'flex', alignItems:'center' }}>
                  <div style={{ width:9, height:9, borderRadius:'50%', background:O, flexShrink:0 }} />
                  <div style={{ flex:1, height:2, background:`linear-gradient(90deg,${O},${O2})` }} />
                  <div style={{ width:9, height:9, borderRadius:'50%', background:O2, flexShrink:0 }} />
                </div>
                <div style={{ fontSize:12, color:'#2d8a4e', fontWeight:700, marginTop:10 }}>{FLIGHT.stops}</div>
              </div>

              <div style={{ textAlign:'left', minWidth:90 }}>
                <div style={{ fontSize:24, fontWeight:800, color:'#1a1a2e' }}>{FLIGHT.arr}</div>
                <div style={{ fontSize:12, color:'#aaa', marginTop:4 }}>{FLIGHT.arrAirport}</div>
              </div>
            </div>

            {/* Info chips */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:20, marginTop:28,
              paddingTop:22, borderTop:'1px solid #f5f0ee' }}>
              {[
                ['Aircraft',         FLIGHT.aircraft],
                ['Class',            FLIGHT.class],
                ['Duration',         FLIGHT.dur],
                ['Stops',            FLIGHT.stops],
                ['Check-in Baggage', '15 Kgs / Adult'],
                ['Cabin Baggage',    '7 Kgs / Adult'],
              ].map(([lbl,val]) => (
                <div key={lbl} style={{ minWidth:100 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:PK,
                    textTransform:'uppercase', letterSpacing:'.1em', marginBottom:5 }}>{lbl}</div>
                  <div style={{ fontSize:13.5, fontWeight:600, color:'#1a1a2e' }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FARE SUMMARY ── */}
        {tab === 'fare' && (
          <div style={{ display:'grid', gridTemplateColumns:'420px 1fr', gap:24, alignItems:'start' }}>

            {/* Fare Breakup card */}
            <div style={{ background:'#fff', borderRadius:14, overflow:'hidden',
              boxShadow:'0 2px 16px rgba(0,0,0,.07)', border:'1px solid #f0e8e8' }}>
              {/* Card header */}
              <div style={{ background:'#fef8f2', padding:'16px 24px',
                borderBottom:'1px solid #f0e8e8' }}>
                <div style={{ fontSize:15, fontWeight:800, color:'#1a1a2e' }}>Fare Breakup</div>
              </div>

              {/* Line items */}
              <div style={{ padding:'8px 24px' }}>
                {[
                  { label:'Base Fare',              val:`₹${FLIGHT.baseFare.toLocaleString()}`, color:'#1a1a2e', bold:false },
                  { label:'Surcharges',              val:`₹${FLIGHT.surcharges.toLocaleString()}`, color:'#1a1a2e', bold:false },
                  { label:'Instant discount applied',val:`-₹${FLIGHT.discount.toLocaleString()}`, color:'#2d8a4e', bold:false },
                ].map(r => (
                  <div key={r.label} style={{ display:'flex', justifyContent:'space-between',
                    padding:'14px 0', borderBottom:'1px solid #f5f0ee' }}>
                    <span style={{ fontSize:14, color:'#555' }}>{r.label}</span>
                    <span style={{ fontSize:14, fontWeight:600, color:r.color }}>{r.val}</span>
                  </div>
                ))}

                {/* Total row */}
                <div style={{ display:'flex', justifyContent:'space-between',
                  padding:'16px 0', marginTop:2 }}>
                  <span style={{ fontSize:16, fontWeight:800, color:'#1a1a2e' }}>TOTAL</span>
                  <span style={{ fontSize:18, fontWeight:800, color:O }}>
                    ₹{(FLIGHT.baseFare + FLIGHT.surcharges - FLIGHT.discount).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Fare Rules card */}
            <div style={{ background:'#fff', borderRadius:14, overflow:'hidden',
              boxShadow:'0 2px 16px rgba(0,0,0,.07)', border:'1px solid #f0e8e8' }}>
              <div style={{ background:'#fef8f2', padding:'16px 24px',
                borderBottom:'1px solid #f0e8e8' }}>
                <div style={{ fontSize:15, fontWeight:800, color:'#1a1a2e' }}>Fare Rules</div>
              </div>
              <div style={{ padding:'8px 24px' }}>
                {[
                  ['Fare Type',        'Corp Fare — SAVER'],
                  ['Advance Purchase', 'No requirement'   ],
                  ['Minimum Stay',     'None'             ],
                  ['Maximum Stay',     'None'             ],
                  ['Refund',           'Allowed with fee' ],
                  ['Date Change',      'Allowed with fee' ],
                  ['Seat Selection',   'Chargeable'       ],
                  ['Meal',             'Not included'     ],
                ].map(([lbl,val]) => (
                  <div key={lbl} style={{ display:'flex', justifyContent:'space-between',
                    padding:'13px 0', borderBottom:'1px solid #f5f0ee' }}>
                    <span style={{ fontSize:13.5, color:'#888' }}>{lbl}</span>
                    <span style={{ fontSize:13.5, fontWeight:600, color:'#1a1a2e' }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CANCELLATION ── */}
        {tab === 'cancel' && (
          <div style={{ background:'#fff', borderRadius:14, overflow:'hidden',
            boxShadow:'0 2px 16px rgba(0,0,0,.07)', border:'1px solid #f0e8e8', maxWidth:700 }}>

            <div style={{ background:'#fef8f2', padding:'16px 24px',
              borderBottom:'1px solid #f0e8e8' }}>
              <div style={{ fontSize:15, fontWeight:800, color:'#1a1a2e' }}>Cancellation Policy</div>
              <div style={{ fontSize:12, color:'#aaa', marginTop:4 }}>
                Jaipur → New Delhi &nbsp;·&nbsp; IndiGo 6E-6492 &nbsp;·&nbsp; SAVER Fare
              </div>
            </div>

            {/* Table header */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr',
              padding:'12px 24px', background:'#fef3f8', gap:16 }}>
              {['Time Before Departure','Cancellation Fee','Refund Status'].map(h => (
                <ColHeader key={h}>{h}</ColHeader>
              ))}
            </div>

            {[
              ['0 – 2 hours before',    'Non-Refundable',  'No Refund',             true,  false],
              ['2 – 24 hours before',   '₹2,250 per pax',  'Partial Refund',        false, false],
              ['24 – 72 hours before',  '₹1,500 per pax',  'Refund applicable',     false, true ],
              ['More than 72 hours',    '₹750 per pax',    'Refund applicable',     false, true ],
            ].map(([time, fee, refund, noRefund, green], i) => (
              <div key={String(time)} style={{
                display:'grid', gridTemplateColumns:'1fr 1fr 1fr',
                padding:'14px 24px', gap:16, alignItems:'center',
                background: i % 2 === 0 ? '#fff' : '#fffaf7',
                borderBottom:'1px solid #f5f0ee',
              }}>
                <div style={{ fontSize:13.5, color:'#555' }}>{time}</div>
                <div style={{ fontSize:13.5, fontWeight:700,
                  color: noRefund ? PK : O }}>{fee}</div>
                <div style={{ fontSize:13, fontWeight:600,
                  color: green ? '#2d8a4e' : noRefund ? PK : '#888' }}>{refund}</div>
              </div>
            ))}

            <div style={{ padding:'14px 24px', background:'#fef8f2',
              borderTop:'1px solid #f0e8e8' }}>
              <span style={{ fontSize:12, color:'#999' }}>
                ⚠ Airline cancellation fee is deducted from the refund amount. Processing fee of ₹200 per passenger may also apply. Refunds are processed within 7–10 business days.
              </span>
            </div>
          </div>
        )}

        {/* ── DATE CHANGE ── */}
        {tab === 'datechange' && (
          <div style={{ background:'#fff', borderRadius:14, overflow:'hidden',
            boxShadow:'0 2px 16px rgba(0,0,0,.07)', border:'1px solid #f0e8e8', maxWidth:700 }}>

            <div style={{ background:'#fef8f2', padding:'16px 24px',
              borderBottom:'1px solid #f0e8e8' }}>
              <div style={{ fontSize:15, fontWeight:800, color:'#1a1a2e' }}>Date Change Policy</div>
              <div style={{ fontSize:12, color:'#aaa', marginTop:4 }}>
                Jaipur → New Delhi &nbsp;·&nbsp; IndiGo 6E-6492 &nbsp;·&nbsp; SAVER Fare
              </div>
            </div>

            {/* Table header */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr',
              padding:'12px 24px', background:'#fef3f8', gap:16 }}>
              {['Time Before Departure','Change Fee','Fare Difference'].map(h => (
                <ColHeader key={h}>{h}</ColHeader>
              ))}
            </div>

            {[
              ['0 – 2 hours before',    '₹3,500 per pax',  'Applicable'],
              ['2 – 24 hours before',   '₹2,000 per pax',  'Applicable'],
              ['24 – 72 hours before',  '₹1,500 per pax',  'Applicable'],
              ['More than 72 hours',    '₹1,000 per pax',  'Applicable'],
            ].map(([time, fee, diff], i) => (
              <div key={String(time)} style={{
                display:'grid', gridTemplateColumns:'1fr 1fr 1fr',
                padding:'14px 24px', gap:16, alignItems:'center',
                background: i % 2 === 0 ? '#fff' : '#fffaf7',
                borderBottom:'1px solid #f5f0ee',
              }}>
                <div style={{ fontSize:13.5, color:'#555' }}>{time}</div>
                <div style={{ fontSize:13.5, fontWeight:700, color:O }}>{fee}</div>
                <div style={{ fontSize:13, color:'#888' }}>{diff}</div>
              </div>
            ))}

            <div style={{ padding:'14px 24px', background:'#fef8f2',
              borderTop:'1px solid #f0e8e8' }}>
              <span style={{ fontSize:12, color:'#999' }}>
                ⚠ Fare difference will be charged if the new fare is higher. No-show after departure: no date change allowed. Changes are subject to seat availability on the new date.
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
