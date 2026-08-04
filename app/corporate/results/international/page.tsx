'use client';
import React, { Suspense, useState, useMemo, type CSSProperties } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Inter, Playfair_Display } from 'next/font/google';
import BookingProgress from '../../components/BookingProgress';
import FlightDetailsDrawer from '../../components/FlightDetailsDrawer';
import CorpHeader from '../../components/CorpHeader';

const inter    = Inter({ subsets:['latin'], weight:['400','500','600','700','800'] });
const playfair = Playfair_Display({ subsets:['latin'], weight:['700'], style:['italic'] });

const O  = '#f07820';
const O2 = '#e86d18';
const PK = '#c9184a';

/* ─── Types ─── */
type SortKey    = 'price' | 'depart' | 'duration';
type StopFilter = 0 | 1 | 2;
type TimeSlot   = '00-06' | '06-12' | '12-18' | '18-00';

function inTimeSlot(dep: string, slot: TimeSlot) {
  const h = parseInt(dep.split(':')[0]) % 24;
  if (slot === '00-06') return h >= 0  && h < 6;
  if (slot === '06-12') return h >= 6  && h < 12;
  if (slot === '12-18') return h >= 12 && h < 18;
  return h >= 18;
}

function getIntlLayoverCity(f: IntlFlight): string | null {
  if (f.outStops === 0 || f.outSegments.length < 2) return null;
  const raw = f.outSegments[0].to;
  return raw.replace(/\s*\(.*?\)$/, '').trim();
}
// Pulls the airport code out of a "City (CODE)" label — e.g. "New Delhi (DEL)" → "DEL".
function codeOnly(full: string): string {
  const m = full.match(/\(([^)]+)\)\s*$/);
  return m ? m[1] : full;
}

type Segment = { airline: string; code: string; color: string; dep: string; arr: string; from: string; to: string; dur: string; layover?: string };
type IntlFlight = {
  id: number;
  airline: string; airCode: string; color: string;
  outDep: string; outArr: string; outDur: string; outStops: number; outStopsLabel: string;
  retDep: string; retArr: string; retDur: string; retStops: number; retStopsLabel: string;
  from: string; to: string;
  price: number;
  outSegments: Segment[];
  retSegments: Segment[];
};

/* ─── Flight Data (DEL ↔ BKK example) ─── */
const FLIGHTS: IntlFlight[] = [
  {
    id:1, airline:'IndiGo', airCode:'6E', color:'#1a237e',
    from:'New Delhi (DEL)', to:'Bangkok Suvarnabhumi (BKK)',
    outDep:'23:30', outArr:'05:30+1', outDur:'5h', outStops:0, outStopsLabel:'Non Stop',
    retDep:'06:30', retArr:'10:00', retDur:'4h 30m', retStops:0, retStopsLabel:'Non Stop',
    price:18450,
    outSegments:[{ airline:'IndiGo', code:'6E-1401', color:'#1a237e', dep:'23:30', arr:'05:30', from:'New Delhi (DEL)', to:'Bangkok (BKK)', dur:'5h 00m' }],
    retSegments:[{ airline:'IndiGo', code:'6E-1402', color:'#1a237e', dep:'06:30', arr:'10:00', from:'Bangkok (BKK)', to:'New Delhi (DEL)', dur:'4h 30m' }],
  },
  {
    id:2, airline:'Air India', airCode:'AI', color:'#c8102e',
    from:'New Delhi (DEL)', to:'Bangkok Suvarnabhumi (BKK)',
    outDep:'10:15', outArr:'16:20', outDur:'6h 05m', outStops:0, outStopsLabel:'Non Stop',
    retDep:'17:30', retArr:'20:45', retDur:'5h 15m', retStops:0, retStopsLabel:'Non Stop',
    price:22800,
    outSegments:[{ airline:'Air India', code:'AI-332', color:'#c8102e', dep:'10:15', arr:'16:20', from:'New Delhi (DEL)', to:'Bangkok (BKK)', dur:'6h 05m' }],
    retSegments:[{ airline:'Air India', code:'AI-333', color:'#c8102e', dep:'17:30', arr:'20:45', from:'Bangkok (BKK)', to:'New Delhi (DEL)', dur:'5h 15m' }],
  },
  {
    id:3, airline:'Thai Airways', airCode:'TG', color:'#6b21a8',
    from:'New Delhi (DEL)', to:'Bangkok Suvarnabhumi (BKK)',
    outDep:'01:45', outArr:'08:15', outDur:'6h 30m', outStops:0, outStopsLabel:'Non Stop',
    retDep:'09:30', retArr:'13:20', retDur:'5h 50m', retStops:0, retStopsLabel:'Non Stop',
    price:24600,
    outSegments:[{ airline:'Thai Airways', code:'TG-315', color:'#6b21a8', dep:'01:45', arr:'08:15', from:'New Delhi (DEL)', to:'Bangkok (BKK)', dur:'6h 30m' }],
    retSegments:[{ airline:'Thai Airways', code:'TG-316', color:'#6b21a8', dep:'09:30', arr:'13:20', from:'Bangkok (BKK)', to:'New Delhi (DEL)', dur:'5h 50m' }],
  },
  {
    id:4, airline:'IndiGo', airCode:'6E', color:'#1a237e',
    from:'New Delhi (DEL)', to:'Bangkok Suvarnabhumi (BKK)',
    outDep:'09:00', outArr:'17:10', outDur:'8h 10m', outStops:1, outStopsLabel:'1 Stop',
    retDep:'18:30', retArr:'23:45', retDur:'7h 15m', retStops:1, retStopsLabel:'1 Stop',
    price:15200,
    outSegments:[
      { airline:'IndiGo', code:'6E-701', color:'#1a237e', dep:'09:00', arr:'11:20', from:'New Delhi (DEL)', to:'Kolkata (CCU)', dur:'2h 20m' },
      { airline:'IndiGo', code:'6E-702', color:'#1a237e', dep:'13:30', arr:'17:10', from:'Kolkata (CCU)', to:'Bangkok (BKK)', dur:'3h 40m', layover:'2h 10m Layover in Kolkata' },
    ],
    retSegments:[
      { airline:'IndiGo', code:'6E-703', color:'#1a237e', dep:'18:30', arr:'22:00', from:'Bangkok (BKK)', to:'Kolkata (CCU)', dur:'3h 30m' },
      { airline:'IndiGo', code:'6E-704', color:'#1a237e', dep:'23:00', arr:'01:45+1', from:'Kolkata (CCU)', to:'New Delhi (DEL)', dur:'2h 45m', layover:'1h 00m Layover in Kolkata' },
    ],
  },
  {
    id:5, airline:'Air Asia', airCode:'AK', color:'#e53935',
    from:'New Delhi (DEL)', to:'Bangkok Don Mueang (DMK)',
    outDep:'21:00', outArr:'03:20+1', outDur:'6h 20m', outStops:0, outStopsLabel:'Non Stop',
    retDep:'04:30', retArr:'07:55', retDur:'5h 25m', retStops:0, retStopsLabel:'Non Stop',
    price:16900,
    outSegments:[{ airline:'Air Asia', code:'AK-47', color:'#e53935', dep:'21:00', arr:'03:20', from:'New Delhi (DEL)', to:'Bangkok DMK (DMK)', dur:'6h 20m' }],
    retSegments:[{ airline:'Air Asia', code:'AK-48', color:'#e53935', dep:'04:30', arr:'07:55', from:'Bangkok DMK (DMK)', to:'New Delhi (DEL)', dur:'5h 25m' }],
  },
  {
    id:6, airline:'Emirates', airCode:'EK', color:'#c8102e',
    from:'New Delhi (DEL)', to:'Bangkok Suvarnabhumi (BKK)',
    outDep:'03:30', outArr:'14:45', outDur:'11h 15m', outStops:1, outStopsLabel:'1 Stop via Dubai',
    retDep:'16:00', retArr:'04:30+1', retDur:'12h 30m', retStops:1, retStopsLabel:'1 Stop via Dubai',
    price:28900,
    outSegments:[
      { airline:'Emirates', code:'EK-511', color:'#c8102e', dep:'03:30', arr:'06:00', from:'New Delhi (DEL)', to:'Dubai (DXB)', dur:'3h 30m' },
      { airline:'Emirates', code:'EK-372', color:'#c8102e', dep:'08:30', arr:'14:45', from:'Dubai (DXB)', to:'Bangkok (BKK)', dur:'6h 15m', layover:'2h 30m Layover in Dubai' },
    ],
    retSegments:[
      { airline:'Emirates', code:'EK-373', color:'#c8102e', dep:'16:00', arr:'19:30', from:'Bangkok (BKK)', to:'Dubai (DXB)', dur:'6h 30m' },
      { airline:'Emirates', code:'EK-512', color:'#c8102e', dep:'21:30', arr:'02:30+1', from:'Dubai (DXB)', to:'New Delhi (DEL)', dur:'3h 00m', layover:'2h 00m Layover in Dubai' },
    ],
  },
];

const MIN_PRICE = Math.min(...FLIGHTS.map(f => f.price));
const MAX_PRICE = Math.max(...FLIGHTS.map(f => f.price));

const AIRLINE_LIST = [...new Set(FLIGHTS.map(f => f.airline))].map(name => ({
  name, code: FLIGHTS.find(f => f.airline === name)!.airCode, color: FLIGHTS.find(f => f.airline === name)!.color,
}));

const LAYOVER_CITIES = [...new Set(
  FLIGHTS.map(f => getIntlLayoverCity(f)).filter((c): c is string => c !== null)
)];

const CB: CSSProperties = { width:13, height:13, accentColor: O, cursor:'pointer', flexShrink:0 };

/* ─── helper: "New Delhi (DEL)" → { city, code } ─── */
function parseCityCode(s: string) {
  const m = s.match(/^(.*?)\s*\(([A-Z]{3})\)$/);
  return m ? { city: m[1].trim(), code: m[2] } : { city: s, code: '' };
}

/* ─── Airline Logo ─── */
function AirlineLogo({ code, color, size = 46, radius = 11 }: { code: string; color: string; size?: number; radius?: number }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div style={{ width:size, height:size, borderRadius:radius, background: color,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize: size * 0.3, fontWeight:800, color:'#fff', letterSpacing:'.02em', flexShrink:0 }}>{code}</div>
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

/* ─── Segment detail row (used in accordion) ─── */
function SegRow({ seg }: { seg: Segment }) {
  const from = parseCityCode(seg.from);
  const to   = parseCityCode(seg.to);
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:12 }}>
      {/* Left: dep time + city + flight no */}
      <div style={{ minWidth:110 }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:5 }}>
          <span style={{ fontSize:12, fontWeight:700, color:'#aaa' }}>{from.code}</span>
          <span style={{ fontSize:17, fontWeight:800, color:'#1a1a2e' }}>{seg.dep}</span>
        </div>
        <div style={{ fontSize:10.5, color:'#777', marginTop:2 }}>{from.city}</div>
        <div style={{ fontSize:10.5, fontWeight:700, color: O, marginTop:4 }}>{seg.code}</div>
      </div>

      {/* Center: duration above line */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', paddingTop:4 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#555', marginBottom:5 }}>{seg.dur}</div>
        <div style={{ width:'100%', height:1.5, background:'#e8ddd5', position:'relative' }}>
          <div style={{ position:'absolute', left:-3, top:'50%', transform:'translateY(-50%)',
            width:6, height:6, borderRadius:'50%', background: O }} />
          <div style={{ position:'absolute', right:-3, top:'50%', transform:'translateY(-50%)',
            width:6, height:6, borderRadius:'50%', background: O }} />
        </div>
      </div>

      {/* Right: arr time + city */}
      <div style={{ minWidth:110, textAlign:'right' }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:5, justifyContent:'flex-end' }}>
          <span style={{ fontSize:17, fontWeight:800, color:'#1a1a2e' }}>{seg.arr}</span>
          <span style={{ fontSize:12, fontWeight:700, color:'#aaa' }}>{to.code}</span>
        </div>
        <div style={{ fontSize:10.5, color:'#777', marginTop:2 }}>{to.city}</div>
      </div>
    </div>
  );
}

/* ─── Combined Flight Card ─── */
function IntlCard({ flight, selected, onSelect, trip }: {
  flight: IntlFlight; selected: boolean; onSelect: (f: IntlFlight) => void; trip: 'one-way'|'round'|'multi';
}) {
  const [openSection, setOpenSection] = useState<'out' | 'ret' | null>(null);
  const outOpen = openSection === 'out';
  const retOpen = openSection === 'ret';
  const [rulesOpen, setRulesOpen] = useState(false);

  const outCodes = flight.outSegments.map(s => s.code).join('/');
  const retCodes = flight.retSegments.map(s => s.code).join('/');
  const codesLabel = trip === 'round' ? `${outCodes} · ${retCodes}` : outCodes;

  return (
    <div style={{
      background:'#fff', borderRadius:12,
      border:`1.5px solid ${selected ? O : '#e8e0d8'}`,
      boxShadow: selected ? `0 0 0 3px ${O}22` : '0 2px 8px rgba(0,0,0,.05)',
      marginBottom:12, overflow:'hidden',
    }}>

      {/* ── Card body ── */}
      <div style={{ display:'flex', alignItems:'stretch' }}>

        {/* Airline Info column */}
        <div style={{ width:116, flexShrink:0, borderRight:'1px solid #f0e8e4',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          gap:5, padding:'16px 10px' }}>
          <AirlineLogo code={flight.airCode} color={flight.color} size={52} />
          <div style={{ fontSize:11.5, fontWeight:700, color:'#222', textAlign:'center', lineHeight:1.3 }}>{flight.airline}</div>
          <div style={{ fontSize:9, color:'#bbb', textAlign:'center', lineHeight:1.4 }}>{codesLabel}</div>
          <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
            {['🍽','📶','🔌','🎬'].map((icon, i) => (
              <span key={i} style={{ fontSize:11, opacity:.7 }}>{icon}</span>
            ))}
          </div>
        </div>

        {/* Flight rows column */}
        <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', justifyContent:'center' }}>

          {/* Outbound row */}
          <div style={{ padding:'14px 16px 12px', borderBottom: trip === 'round' ? '1px solid #f5ede8' : 'none' }}>
            {/* Row 1 — times + route line perfectly centred */}
            <div style={{ display:'flex', alignItems:'center', marginBottom:6 }}>
              <div style={{ minWidth:100 }}>
                <span style={{ fontSize:11, fontWeight:700, color:'#999', marginRight:5 }}>DEL</span>
                <span style={{ fontSize:22, fontWeight:800, color:'#1a1a2e', lineHeight:1 }}>{flight.outDep}</span>
              </div>
              <div style={{ flex:1, padding:'0 12px' }}>
                <div style={{ height:1.5, background:'#e0d8d0', position:'relative' }}>
                  <div style={{ position:'absolute', left:-4, top:'50%', transform:'translateY(-50%)',
                    width:7, height:7, borderRadius:'50%', background: O }} />
                  <div style={{ position:'absolute', right:-4, top:'50%', transform:'translateY(-50%)',
                    width:7, height:7, borderRadius:'50%', background: O }} />
                </div>
              </div>
              <div style={{ minWidth:100, textAlign:'right' }}>
                <span style={{ fontSize:22, fontWeight:800, color:'#1a1a2e', lineHeight:1 }}>{flight.outArr}</span>
                <span style={{ fontSize:11, fontWeight:700, color:'#999', marginLeft:5 }}>BKK</span>
              </div>
              <button onClick={() => setOpenSection(p => p === 'out' ? null : 'out')}
                style={{ background:'none', border:'none', cursor:'pointer', fontFamily:'inherit',
                  display:'flex', alignItems:'center', gap:3, marginLeft:14, flexShrink:0, padding:0, width:92 }}>
                <span style={{ fontSize:11.5, color:'#555', fontWeight:600, whiteSpace:'nowrap' }}>Flight Details</span>
                <span style={{ fontSize:10, color:'#888', display:'inline-block', transition:'transform .2s',
                  transform: outOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
              </button>
            </div>
            {/* Row 2 — duration centred, city/date under airport codes */}
            <div style={{ display:'flex', alignItems:'flex-start' }}>
              <div style={{ minWidth:100 }}>
                <div style={{ fontSize:10, color:'#aaa' }}>Thu, 30 Jul</div>
                <div style={{ fontSize:11, color:'#555', fontWeight:500, marginTop:1 }}>New Delhi</div>
              </div>
              <div style={{ flex:1, textAlign:'center', fontSize:10.5, color:'#999', paddingTop:1 }}>
                {flight.outDur} · {flight.outStopsLabel}
              </div>
              <div style={{ minWidth:100, textAlign:'right' }}>
                <div style={{ fontSize:10, color:'#aaa' }}>Thu, 30 Jul</div>
                <div style={{ fontSize:11, color:'#555', fontWeight:500, marginTop:1 }}>Bangkok</div>
              </div>
              <div style={{ width:106 }} />
            </div>
          </div>

          {/* Return row */}
          {trip === 'round' && (
            <div style={{ padding:'12px 16px 14px' }}>
              {/* Row 1 — times + route line */}
              <div style={{ display:'flex', alignItems:'center', marginBottom:6 }}>
                <div style={{ minWidth:100 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'#999', marginRight:5 }}>BKK</span>
                  <span style={{ fontSize:22, fontWeight:800, color:'#1a1a2e', lineHeight:1 }}>{flight.retDep}</span>
                </div>
                <div style={{ flex:1, padding:'0 12px' }}>
                  <div style={{ height:1.5, background:'#e0d8d0', position:'relative' }}>
                    <div style={{ position:'absolute', left:-4, top:'50%', transform:'translateY(-50%)',
                      width:7, height:7, borderRadius:'50%', background: PK }} />
                    <div style={{ position:'absolute', right:-4, top:'50%', transform:'translateY(-50%)',
                      width:7, height:7, borderRadius:'50%', background: PK }} />
                  </div>
                </div>
                <div style={{ minWidth:100, textAlign:'right' }}>
                  <span style={{ fontSize:22, fontWeight:800, color:'#1a1a2e', lineHeight:1 }}>{flight.retArr}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:'#999', marginLeft:5 }}>DEL</span>
                </div>
                <button onClick={() => setOpenSection(p => p === 'ret' ? null : 'ret')}
                  style={{ background:'none', border:'none', cursor:'pointer', fontFamily:'inherit',
                    display:'flex', alignItems:'center', gap:3, marginLeft:14, flexShrink:0, padding:0, width:92 }}>
                  <span style={{ fontSize:11.5, color:'#555', fontWeight:600, whiteSpace:'nowrap' }}>Flight Details</span>
                  <span style={{ fontSize:10, color:'#888', display:'inline-block', transition:'transform .2s',
                    transform: retOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
                </button>
              </div>
              {/* Row 2 — duration centred, city/date under airport codes */}
              <div style={{ display:'flex', alignItems:'flex-start' }}>
                <div style={{ minWidth:100 }}>
                  <div style={{ fontSize:10, color:'#aaa' }}>Thu, 6 Aug</div>
                  <div style={{ fontSize:11, color:'#555', fontWeight:500, marginTop:1 }}>Bangkok</div>
                </div>
                <div style={{ flex:1, textAlign:'center', fontSize:10.5, color:'#999', paddingTop:1 }}>
                  {flight.retDur} · {flight.retStopsLabel}
                </div>
                <div style={{ minWidth:100, textAlign:'right' }}>
                  <div style={{ fontSize:10, color:'#aaa' }}>Thu, 6 Aug</div>
                  <div style={{ fontSize:11, color:'#555', fontWeight:500, marginTop:1 }}>New Delhi</div>
                </div>
                <div style={{ width:106 }} />
              </div>
            </div>
          )}
        </div>

        {/* Price + CTA column */}
        <div style={{ width:148, flexShrink:0, borderLeft:'1px solid #f0e8e4',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          gap:12, padding:'16px 14px' }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:800, color:'#1a1a2e', letterSpacing:'-.01em' }}>
              ₹{flight.price.toLocaleString()}
            </div>
            <div style={{ fontSize:9.5, color:'#aaa', marginTop:2 }}>per adult · incl. taxes</div>
          </div>
          <button
            onClick={() => { onSelect(flight); window.location.href = `/corporate/passenger-details?trip=${trip}&type=international`; }}
            style={{
              width:'100%', padding:'9px 0',
              background:'transparent', color: PK,
              border:`2px solid ${PK}`, borderRadius:6,
              fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
              transition:'background .15s, color .15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = PK; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = PK; }}
          >Book Now</button>
          <button onClick={() => setRulesOpen(true)} style={{
            background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', padding:0,
            fontSize:11, color:'#999', display:'flex', alignItems:'center', gap:3 }}>
            Fare Rules <span style={{ fontSize:9 }}>↗</span>
          </button>
        </div>
      </div>

      {/* ── Outbound segment detail ── */}
      {outOpen && (
        <div style={{ background:'#fafaf8', padding:'12px 20px 14px', borderTop:'1px solid #f0e8e8' }}>
          <div style={{ fontSize:9.5, fontWeight:800, color: O, letterSpacing:'.1em', marginBottom:10, textTransform:'uppercase' }}>
            Outbound Segments
          </div>
          {flight.outSegments.map((seg, i) => (
            <React.Fragment key={i}>
              {i > 0 && seg.layover && (
                <div style={{ display:'flex', justifyContent:'center', margin:'-6px 0 10px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6,
                    padding:'5px 14px', background:'#fff8f0',
                    border:'1px solid #f5ddc8', borderRadius:20 }}>
                    <span style={{ fontSize:12 }}>⏱</span>
                    <span style={{ fontSize:11, fontWeight:700, color: O }}>{seg.layover}</span>
                  </div>
                </div>
              )}
              <SegRow seg={seg} />
            </React.Fragment>
          ))}
        </div>
      )}

      {/* ── Return segment detail ── */}
      {retOpen && trip === 'round' && (
        <div style={{ background:'#fdf8f8', padding:'12px 20px 14px', borderTop:'1px solid #f0e8e8' }}>
          <div style={{ fontSize:9.5, fontWeight:800, color: PK, letterSpacing:'.1em', marginBottom:10, textTransform:'uppercase' }}>
            Return Segments
          </div>
          {flight.retSegments.map((seg, i) => (
            <React.Fragment key={i}>
              {i > 0 && seg.layover && (
                <div style={{ display:'flex', alignItems:'center', gap:6,
                  margin:'-4px 0 10px', padding:'5px 12px',
                  background:'#fff0f4', border:'1px solid #f5c8d4', borderRadius:20,
                  width:'fit-content' }}>
                  <span style={{ fontSize:12 }}>⏱</span>
                  <span style={{ fontSize:11, fontWeight:700, color: PK }}>{seg.layover}</span>
                </div>
              )}
              <SegRow seg={seg} />
            </React.Fragment>
          ))}
        </div>
      )}

      {rulesOpen && (
        <FlightDetailsDrawer
          onClose={() => setRulesOpen(false)}
          routeLabel={`${flight.from.replace(/\s*\(.*?\)$/, '')} → ${flight.to.replace(/\s*\(.*?\)$/, '')}`}
          fareRows={[
            { label: 'Fare', sub: 'Adult (1 × fare)', value: `₹ ${flight.price.toLocaleString()}` },
            { label: 'Total Amount', value: `₹ ${flight.price.toLocaleString()}`, bold: true },
          ]}
          fareRules={INTL_FARE_RULES}
          baggageLegs={[
            {
              routeLabel: `${codeOnly(flight.from)} → ${codeOnly(flight.to)}`,
              directionLabel: trip === 'round' ? 'DEPART' : undefined,
              checkIn: '15 kgs (1 piece only)',
              cabin: '5-7 Kgs (1 piece only)',
            },
            ...(trip === 'round' ? [{
              routeLabel: `${codeOnly(flight.to)} → ${codeOnly(flight.from)}`,
              directionLabel: 'RETURN',
              checkIn: '15 kgs (1 piece only)',
              cabin: '5-7 Kgs (1 piece only)',
            }] : []),
          ]}
        />
      )}
    </div>
  );
}

const INTL_FARE_RULES = [
  'International bookings are subject to airline-specific rules and cancellation charges. Please contact the airline or our support team for details.',
  'GST and RAF charges will be applicable on the cancellation penalty.',
  'The above data is indicative — fare rules are subject to change by the airline from time to time depending on fare class, and change/cancellation fee amount may also vary based on fluctuations in currency conversion rates.',
  'Cancellation/Reissue fees will follow the more restrictive fare type.',
  'Feel free to call our Contact Centre for exact cancellation/change fee.',
  'Cancellation/Date change requests will be accepted up to 30 hrs prior to departure.',
];

/* ─── Read the incoming search from the URL (sent by the dashboard search form) ─── */
function parseInitialSearch(sp: { get(key: string): string | null; getAll(key: string): string[] }) {
  const fallback = {
    trip: 'round' as 'one-way'|'round'|'multi',
    from: 'New Delhi, India (DEL)',
    to: 'Bangkok, Thailand (BKK)',
    depDate: '30/07/2026',
    retDate: '06/08/2026',
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

  const fromCities = sp.getAll('from_city[]');
  const toCities    = sp.getAll('to_city[]');
  const departures  = sp.getAll('departure[]');

  const parseCount = (raw: string | null, fallbackN: number) => {
    const n = parseInt((raw ?? '').trim(), 10);
    return Number.isFinite(n) ? n : fallbackN;
  };

  return {
    trip,
    from: fromCities[0] || fallback.from,
    to:   toCities[0]   || fallback.to,
    depDate: departures[0] || fallback.depDate,
    retDate: departures[1] || fallback.retDate,
    adults:   parseCount(sp.get('adults'),   fallback.adults),
    children: parseCount(sp.get('childs'),   fallback.children),
    infants:  parseCount(sp.get('infants'),  fallback.infants),
    cabinClass: sp.get('class')?.trim() || fallback.cabinClass,
  };
}

/* ─── Main Page ─── */
export default function IntlResultsPage() {
  return (
    <Suspense fallback={null}>
      <IntlResultsPageInner />
    </Suspense>
  );
}

function IntlResultsPageInner() {
  const searchParams = useSearchParams();
  const initialSearch = useMemo(() => parseInitialSearch(searchParams), [searchParams]);
  const [trip, setTrip] = useState<'one-way'|'round'|'multi'>(initialSearch.trip);

  const [selected,      setSelected]      = useState<IntlFlight>(FLIGHTS[0]);
  const [sortBy,        setSortBy]        = useState<SortKey>('price');
  const [filterAir,     setFilterAir]     = useState<string[]>([]);
  const [filterStops,   setFilterStops]   = useState<StopFilter[]>([]);
  const [filterTime,    setFilterTime]    = useState<TimeSlot[]>([]);
  const [filterLayover, setFilterLayover] = useState<string[]>([]);
  const [priceMax,      setPriceMax]      = useState(MAX_PRICE);

  /* Search bar state */
  const [from,        setFrom]        = useState(initialSearch.from);
  const [to,          setTo]          = useState(initialSearch.to);
  const [depDate,     setDepDate]     = useState(initialSearch.depDate);
  const [retDate,     setRetDate]     = useState(initialSearch.retDate);
  const [paxOpen,     setPaxOpen]     = useState(false);
  const [adults,      setAdults]      = useState(initialSearch.adults);
  const [children,    setChildren]    = useState(initialSearch.children);
  const [infants,     setInfants]     = useState(initialSearch.infants);
  const [cabinClass,  setCabinClass]  = useState(initialSearch.cabinClass);
  const totalPax = adults + children + infants;
  const paxLabel = `${totalPax} Traveller${totalPax !== 1 ? 's' : ''}, ${cabinClass}`;
  const CABINS   = ['Economy','Business','First Class','Premium Economy'];

  function toggleArr<T>(set: React.Dispatch<React.SetStateAction<T[]>>, val: T) {
    set(p => p.includes(val) ? p.filter(x => x !== val) : [...p, val]);
  }

  const filtered = useMemo(() => FLIGHTS.filter(f => {
    if (filterStops.length && !filterStops.includes(f.outStops as StopFilter)) return false;
    if (filterTime.length  && !filterTime.some(s => inTimeSlot(f.outDep, s))) return false;
    if (filterAir.length   && !filterAir.includes(f.airCode)) return false;
    if (filterLayover.length) {
      const city = getIntlLayoverCity(f);
      if (!city || !filterLayover.includes(city)) return false;
    }
    if (f.price > priceMax) return false;
    return true;
  }), [filterStops, filterTime, filterAir, filterLayover, priceMax]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    if (sortBy === 'price')    return a.price - b.price;
    if (sortBy === 'depart')   return a.outDep.localeCompare(b.outDep);
    if (sortBy === 'duration') return a.outDur.localeCompare(b.outDur);
    return 0;
  }), [filtered, sortBy]);

  return (
    <div className={inter.className} style={{ background:'#f9f2ec', minHeight:'100vh', color:'#1a1a2e' }}>

      {/* ── NAV ── */}
      <CorpHeader />

      {/* ── BOOKING PROGRESS ── */}
      <div style={{ padding:'14px 5% 0' }}>
        <BookingProgress step={2} />
      </div>

      {/* ── COMPACT SEARCH BAR ── */}
      <div style={{ background:'#fdf8f3', borderBottom:`1.5px solid ${O}22`,
        padding:'10px 5%', boxShadow:'0 3px 14px rgba(240,120,32,.08)',
        position:'sticky', top:58, zIndex:150 }}>
        <div style={{ maxWidth:1240, margin:'0 auto', display:'flex', alignItems:'center', gap:8 }}>

          {([
            { label:'TRIP TYPE', content:(
              <select value={trip} onChange={e => setTrip(e.target.value as 'one-way'|'round'|'multi')}
                style={{ background:'transparent', border:'none', outline:'none',
                color:'#1a1a2e', fontWeight:700, fontSize:13, fontFamily:'inherit',
                cursor:'pointer', appearance:'none', WebkitAppearance:'none' }}>
                <option value="one-way">One Way</option>
                <option value="round">Round Trip</option>
                <option value="multi">Multi City</option>
              </select>
            ), flex:0.9 },
            { label:'FROM CITY', content:(
              <input value={from} onChange={e => setFrom(e.target.value)} style={{
                background:'transparent', border:'none', outline:'none',
                color:'#1a1a2e', fontWeight:700, fontSize:13, fontFamily:'inherit', width:'100%' }} />
            ), flex:1.6, swap:true },
            { label:'TO CITY', content:(
              <input value={to} onChange={e => setTo(e.target.value)} style={{
                background:'transparent', border:'none', outline:'none',
                color:'#1a1a2e', fontWeight:700, fontSize:13, fontFamily:'inherit', width:'100%' }} />
            ), flex:1.6 },
            { label:'DEPART', content:(
              <input value={depDate} onChange={e => setDepDate(e.target.value)} style={{
                background:'transparent', border:'none', outline:'none',
                color:'#1a1a2e', fontWeight:700, fontSize:13, fontFamily:'inherit', width:'100%' }} />
            ), flex:1.1 },
            ...(trip === 'round' ? [{ label:'RETURN', content:(
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <input value={retDate} onChange={e => setRetDate(e.target.value)} style={{
                  background:'transparent', border:'none', outline:'none',
                  color:'#1a1a2e', fontWeight:700, fontSize:13, fontFamily:'inherit', flex:1 }} />
                <button onClick={() => setRetDate('')}
                  style={{ background:'none', border:'none', color:'#bbb',
                    cursor:'pointer', fontSize:14, lineHeight:1, padding:0, flexShrink:0 }}>✕</button>
              </div>
            ), flex:1.1 }] as { label:string; content:React.ReactNode; flex:number; swap?:boolean }[] : []),
            { label:'PASSENGERS & CLASS', content:(
              <div style={{ position:'relative' }}>
                <button onClick={() => setPaxOpen(p => !p)} style={{
                  background:'transparent', border:'none', outline:'none', padding:0,
                  color:'#1a1a2e', fontWeight:700, fontSize:13, fontFamily:'inherit',
                  cursor:'pointer', textAlign:'left', width:'100%',
                  display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ flex:1 }}>{paxLabel}</span>
                  <span style={{ fontSize:9, color: O, flexShrink:0 }}>▼</span>
                </button>
                {paxOpen && (
                  <div style={{ position:'absolute', top:'calc(100% + 14px)', right:0,
                    background:'#fff', borderRadius:14, zIndex:500,
                    boxShadow:'0 12px 48px rgba(0,0,0,.15)', padding:'6px 20px 18px',
                    minWidth:280, border:'1px solid #f0e8e8' }}>
                    {[
                      { label:'Adults',   sub:'12+ yrs',     val:adults,   set:setAdults,   min:1 },
                      { label:'Children', sub:'2 – 11 yrs',  val:children, set:setChildren, min:0 },
                      { label:'Infants',  sub:'Under 2 yrs', val:infants,  set:setInfants,  min:0 },
                    ].map((row, i, arr) => (
                      <div key={row.label} style={{ display:'flex', justifyContent:'space-between',
                        alignItems:'center', padding:'13px 0',
                        borderBottom: i < arr.length - 1 ? '1px solid #f5f0ee' : 'none' }}>
                        <div>
                          <div style={{ fontSize:13.5, fontWeight:600, color:'#1a1a2e' }}>{row.label}</div>
                          <div style={{ fontSize:11, color:'#bbb', marginTop:2 }}>{row.sub}</div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                          <button onClick={() => row.set(Math.max(row.min, row.val - 1))} style={{
                            width:30, height:30, borderRadius:'50%', border:`1.5px solid ${O}`,
                            background:'#fff', color: O, cursor:'pointer', fontSize:18,
                            fontWeight:700, fontFamily:'inherit',
                            display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                          <span style={{ fontSize:15, fontWeight:700, color:'#1a1a2e',
                            minWidth:18, textAlign:'center' }}>{row.val}</span>
                          <button onClick={() => row.set(row.val + 1)} style={{
                            width:30, height:30, borderRadius:'50%', border:`1.5px solid ${O}`,
                            background:'#fff', color: O, cursor:'pointer', fontSize:18,
                            fontWeight:700, fontFamily:'inherit',
                            display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                        </div>
                      </div>
                    ))}
                    <div style={{ marginTop:14, position:'relative' }}>
                      <select value={cabinClass} onChange={e => setCabinClass(e.target.value)} style={{
                        width:'100%', padding:'10px 36px 10px 16px',
                        border:`1.5px solid ${O}`, borderRadius:24, color: O,
                        fontSize:13, fontWeight:600, fontFamily:'inherit',
                        background:'#fff', cursor:'pointer', outline:'none',
                        appearance:'none', WebkitAppearance:'none' }}>
                        {CABINS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <span style={{ position:'absolute', right:14, top:'50%',
                        transform:'translateY(-50%)', fontSize:9, color: O, pointerEvents:'none' }}>▼</span>
                    </div>
                    <button onClick={() => setPaxOpen(false)} style={{
                      width:'100%', marginTop:12, padding:'11px',
                      background:`linear-gradient(135deg,${O},${O2})`,
                      color:'#fff', border:'none', borderRadius:24,
                      fontSize:14, fontWeight:700, cursor:'pointer',
                      fontFamily:'inherit', boxShadow:`0 4px 14px ${O}55` }}>Done</button>
                  </div>
                )}
              </div>
            ), flex:1.5 },
          ] as { label:string; content:React.ReactNode; flex:number; swap?:boolean }[]).map(field => (
            <React.Fragment key={field.label}>
              <div style={{ flex:field.flex, minWidth:0,
                background:'#fff', border:'1.5px solid #e8ddd4',
                borderRadius:9, padding:'7px 14px',
                display:'flex', flexDirection:'column', justifyContent:'center', gap:2 }}>
                <div style={{ fontSize:8.5, fontWeight:800, color: O,
                  letterSpacing:'.12em', textTransform:'uppercase' }}>{field.label}</div>
                {field.content}
              </div>
              {field.swap && (
                <button onClick={() => { const t=from; setFrom(to); setTo(t); }}
                  style={{ flexShrink:0, width:32, height:32, borderRadius:'50%',
                    background:'#fff', border:`1.5px solid ${O}`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:14, color: O, cursor:'pointer', boxShadow:`0 2px 6px ${O}22` }}>⇄</button>
              )}
            </React.Fragment>
          ))}

          <button style={{ flexShrink:0, padding:'13px 22px',
            background:`linear-gradient(135deg,${O},${O2})`,
            color:'#fff', border:'none', borderRadius:9,
            fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit',
            letterSpacing:'.06em', boxShadow:`0 4px 14px ${O}55` }}>SEARCH</button>
        </div>
        <div style={{ textAlign:'center', padding:'4px 0 6px',
          fontSize:11.5, fontWeight:700, color:`${O}99`, letterSpacing:'.02em' }}>
          Introducing combo flight selection
        </div>
      </div>

      {/* ── ROUTE BANNER ── */}
      <div style={{ padding:'10px 5% 0', maxWidth:1240, margin:'0 auto', boxSizing:'border-box' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0' }}>
          <span style={{ fontSize:18, fontWeight:800, color:'#1a1a2e' }}>New Delhi</span>
          <span style={{ fontSize:16, color: O }}>✈</span>
          <span style={{ fontSize:18, fontWeight:800, color:'#1a1a2e' }}>Bangkok</span>
          {trip === 'round' && <>
            <span style={{ fontSize:16, color: PK }}>✈</span>
            <span style={{ fontSize:18, fontWeight:800, color:'#1a1a2e' }}>New Delhi</span>
          </>}
          <span style={{ fontSize:12, color:'#aaa', marginLeft:6 }}>— {sorted.length} result{sorted.length !== 1 ? 's' : ''}</span>
          <span style={{ marginLeft:'auto', fontSize:11, fontWeight:700, color:'#fff',
            background: trip === 'round' ? O : '#1a237e', borderRadius:20, padding:'4px 12px' }}>
            {trip === 'round' ? 'Round Trip' : 'One Way'} · International
          </span>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ padding:'12px 5% 24px', maxWidth:1240, margin:'0 auto', boxSizing:'border-box' }}>

        {/* Sort bar */}
        <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:14,
          background:'#fff', borderRadius:12, padding:'10px 20px',
          border:'1px solid #ede8e8', boxShadow:'0 1px 6px rgba(0,0,0,.04)' }}>
          <span style={{ fontSize:12, color:'#999', fontWeight:700, marginRight:18, whiteSpace:'nowrap' }}>Sort By:</span>
          <div style={{ display:'flex', flex:1, gap:8 }}>
            {([['price','PRICE'],['depart','DEPART'],['duration','DURATION']] as [SortKey,string][]).map(([key,lbl]) => {
              const active = sortBy === key;
              return (
                <button key={key} onClick={() => setSortBy(key)} style={{
                  flex:1, padding:'9px 0', borderRadius:8,
                  background: active ? `linear-gradient(135deg,${O},${O2})` : '#fff',
                  border: active ? 'none' : '1.5px solid #e8ddd5',
                  color: active ? '#fff' : '#8a7060',
                  fontSize:11.5, fontWeight:800, cursor:'pointer', fontFamily:'inherit',
                  letterSpacing:'.06em', boxShadow: active ? `0 3px 10px ${O}44` : 'none',
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
                <button onClick={() => { setFilterStops([]); setFilterTime([]); setFilterAir([]); setFilterLayover([]); setPriceMax(MAX_PRICE); }}
                  style={{ background:'none', border:'none', fontSize:11, color: PK,
                    fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                    display:'flex', alignItems:'center', gap:3 }}>✕ Clear filter</button>
              </div>

              {/* ── Stops ── */}
              <div style={{ borderTop:'1px solid #f5ede8', paddingTop:12, marginBottom:12 }}>
                <div style={{ fontSize:10.5, fontWeight:800, color:'#888',
                  letterSpacing:'.08em', textTransform:'uppercase', marginBottom:8 }}>Stops (Outbound)</div>
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
                  {AIRLINE_LIST.map(a => {
                    const checked = filterAir.includes(a.code);
                    return (
                      <label key={a.code} onClick={() => toggleArr(setFilterAir, a.code)}
                        style={{ display:'flex', alignItems:'center', gap:8,
                          cursor:'pointer', userSelect:'none',
                          padding:'5px 8px', borderRadius:7,
                          background: checked ? `${O}08` : 'transparent',
                          border: checked ? `1px solid ${O}33` : '1px solid transparent' }}>
                        <div style={{ width:14, height:14, borderRadius:4, flexShrink:0,
                          border: checked ? `2px solid ${O}` : '1.5px solid #ccc',
                          background: checked ? O : '#fff',
                          display:'flex', alignItems:'center', justifyContent:'center' }}>
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

              {/* ── Layover Airport ── */}
              {LAYOVER_CITIES.length > 0 && (
                <div style={{ borderTop:'1px solid #f5ede8', paddingTop:12, marginBottom:12 }}>
                  <div style={{ fontSize:10.5, fontWeight:800, color:'#888',
                    letterSpacing:'.08em', textTransform:'uppercase', marginBottom:8 }}>Layover Airport</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {LAYOVER_CITIES.map(city => {
                      const checked = filterLayover.includes(city);
                      const count   = FLIGHTS.filter(f => getIntlLayoverCity(f) === city).length;
                      return (
                        <label key={city} onClick={() => toggleArr(setFilterLayover, city)}
                          style={{ display:'flex', alignItems:'center', gap:8,
                            cursor:'pointer', userSelect:'none',
                            padding:'6px 8px', borderRadius:7,
                            background: checked ? `${O}08` : 'transparent',
                            border: checked ? `1px solid ${O}33` : '1px solid transparent' }}>
                          <div style={{ width:14, height:14, borderRadius:4, flexShrink:0,
                            border: checked ? `2px solid ${O}` : '1.5px solid #ccc',
                            background: checked ? O : '#fff',
                            display:'flex', alignItems:'center', justifyContent:'center' }}>
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
                      {FLIGHTS.filter(f => filterLayover.includes(getIntlLayoverCity(f) ?? '')).length} flights match
                    </div>
                  )}
                </div>
              )}

              {/* ── Price Range ── */}
              <div style={{ borderTop:'1px solid #f5ede8', paddingTop:12, marginBottom:12 }}>
                <div style={{ fontSize:10.5, fontWeight:800, color:'#888',
                  letterSpacing:'.08em', textTransform:'uppercase', marginBottom:10 }}>Price Range</div>
                <input type="range" min={MIN_PRICE} max={MAX_PRICE} value={priceMax}
                  onChange={e => setPriceMax(Number(e.target.value))}
                  style={{ width:'100%', accentColor: O, height:4 }} />
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
                  <span style={{ fontSize:10.5, color:'#aaa' }}>₹{MIN_PRICE.toLocaleString()}</span>
                  <span style={{ fontSize:10.5, fontWeight:700, color: O }}>₹{priceMax.toLocaleString()}</span>
                </div>
              </div>

              {/* ── Aircraft ── */}
              <div style={{ borderTop:'1px solid #f5ede8', paddingTop:12 }}>
                <div style={{ fontSize:10.5, fontWeight:800, color:'#888',
                  letterSpacing:'.08em', textTransform:'uppercase', marginBottom:8 }}>Aircraft</div>
                {['Airbus A321','Boeing 777','Boeing 787'].map(ac => (
                  <label key={ac} style={{ display:'flex', alignItems:'center', gap:8,
                    cursor:'pointer', userSelect:'none', fontSize:11.5, color:'#666', marginBottom:6 }}>
                    <input type="checkbox" style={CB} />
                    {ac}
                  </label>
                ))}
              </div>

            </div>
          </div>

          {/* ── RESULTS ── */}
          <div style={{ flex:1, minWidth:0 }}>
            {sorted.length === 0 ? (
              <div style={{ background:'#fff', borderRadius:12, padding:'40px 24px', textAlign:'center', border:'1px solid #ede8e8' }}>
                <div style={{ fontSize:36, marginBottom:10 }}>✈️</div>
                <div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>No flights match your filters</div>
                <div style={{ fontSize:13, color:'#aaa' }}>Try adjusting or clearing your filters.</div>
              </div>
            ) : sorted.map(f => (
              <IntlCard
                key={f.id}
                flight={f}
                trip={trip}
                selected={selected.id === f.id}
                onSelect={setSelected}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
