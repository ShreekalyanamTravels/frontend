'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Inter, Playfair_Display } from 'next/font/google';
import CorpFooter from '../components/CorpFooter';
import CorpHeader from '../components/CorpHeader';

const inter    = Inter({ subsets: ['latin'], weight: ['400','500','600','700','800'] });
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'], style: ['italic'] });

const O  = '#f07820';
const O2 = '#e86d18';
const PK = '#c9184a';

const DESTINATIONS = [
  'Worldwide (Excluding USA & Canada)',
  'Worldwide (Including USA & Canada)',
  'Asia',
  'Europe',
  'Domestic (India)',
];

const COVER_HIGHLIGHTS = [
  { icon: '🏥', label: 'Medical Expenses', sub: 'Hospitalisation & emergency care' },
  { icon: '✈️', label: 'Trip Cancellation', sub: 'Pre-departure cancellation cover' },
  { icon: '🧳', label: 'Baggage Loss', sub: 'Lost, stolen or delayed baggage' },
  { icon: '⏰', label: 'Trip Delay', sub: 'Compensation for delays' },
  { icon: '🛂', label: 'Passport Loss', sub: 'Emergency travel document assistance' },
  { icon: '⚖️', label: 'Legal Liability', sub: 'Third-party personal liability' },
];

export default function InsurancePage() {
  const [tripType, setTripType]       = useState<'single' | 'annual'>('single');
  const [destination, setDestination] = useState(DESTINATIONS[0]);
  const [depDate, setDepDate]         = useState('');
  const [retDate, setRetDate]         = useState('');
  const [adults, setAdults]           = useState(1);
  const [children, setChildren]       = useState(0);

  function handleSearch() {
    const params = new URLSearchParams({
      type: tripType,
      dest: destination,
      dep: depDate,
      ret: retDate,
      adults: String(adults),
      children: String(children),
    });
    window.location.href = `/corporate/insurance/plans?${params.toString()}`;
  }

  const INP: React.CSSProperties = {
    width: '100%', padding: '11px 14px', border: '1.5px solid #e8e0da',
    borderRadius: 8, fontSize: 13, color: '#1a1a2e', outline: 'none',
    background: '#fff', fontFamily: 'inherit', boxSizing: 'border-box',
  };
  const LBL: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: '#999', letterSpacing: '.07em',
    textTransform: 'uppercase', display: 'block', marginBottom: 5,
  };

  return (
    <div className={inter.className} style={{ background: '#fdf6f2', minHeight: '100vh', color: '#1a1a2e' }}>

      {/* NAV */}
      <CorpHeader />

      {/* HERO */}
      <div style={{ background: `linear-gradient(135deg,${O} 0%,#c8622a 55%,#7a3010 100%)`,
        padding: '48px 5% 56px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,.15)', borderRadius: 20, padding: '5px 16px', marginBottom: 16 }}>
          <span style={{ fontSize: 14 }}>🛡️</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '.08em' }}>TRAVEL INSURANCE</span>
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', margin: '0 0 10px', letterSpacing: '-.02em' }}>
          Travel Worry-Free
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,.8)', margin: 0, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
          Comprehensive travel insurance covering medical emergencies, trip cancellation, baggage loss and more.
        </p>
      </div>

      {/* SEARCH CARD */}
      <div style={{ maxWidth: 900, margin: '-36px auto 40px', padding: '0 20px' }}>
        <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 40px rgba(240,120,32,.14)',
          padding: '28px 32px', border: '1px solid #f0e8e0' }}>

          {/* Trip type tabs */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            {(['single', 'annual'] as const).map(t => (
              <button key={t} onClick={() => setTripType(t)}
                style={{
                  padding: '9px 26px', borderRadius: 24,
                  border: tripType === t ? 'none' : '1.5px solid #e8e0da',
                  background: tripType === t ? `linear-gradient(135deg,${O},${O2})` : '#fafafa',
                  color: tripType === t ? '#fff' : '#888',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: tripType === t ? `0 4px 14px ${O}44` : 'none',
                }}>
                {t === 'single' ? '✈ Single Trip' : '🔄 Annual Multi-Trip'}
              </button>
            ))}
          </div>

          {/* Form grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
            {/* Destination */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={LBL}>Destination</label>
              <select value={destination} onChange={e => setDestination(e.target.value)} style={{
                ...INP,
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
                paddingRight: 36,
              }}>
                {DESTINATIONS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>

            {/* Departure date */}
            <div>
              <label style={LBL}>Departure Date</label>
              <input type="date" value={depDate} onChange={e => setDepDate(e.target.value)} style={INP} />
            </div>

            {/* Return date */}
            <div>
              <label style={LBL}>{tripType === 'annual' ? 'Policy Start Date' : 'Return Date'}</label>
              <input type="date" value={retDate} onChange={e => setRetDate(e.target.value)} style={INP} />
            </div>
          </div>

          {/* Travellers row */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, marginBottom: 24 }}>
            <div style={{ flex: 1 }}>
              <label style={LBL}>Adults (18–70 yrs)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => setAdults(p => Math.max(1, p - 1))}
                  style={{ width: 32, height: 32, borderRadius: '50%', border: `1.5px solid ${O}`,
                    background: '#fff', color: O, fontSize: 18, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>−</button>
                <span style={{ fontSize: 16, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{adults}</span>
                <button onClick={() => setAdults(p => Math.min(9, p + 1))}
                  style={{ width: 32, height: 32, borderRadius: '50%', border: `1.5px solid ${O}`,
                    background: '#fff', color: O, fontSize: 18, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>+</button>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={LBL}>Children (6 months–17 yrs)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => setChildren(p => Math.max(0, p - 1))}
                  style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid #e8e0da',
                    background: '#fff', color: '#aaa', fontSize: 18, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>−</button>
                <span style={{ fontSize: 16, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{children}</span>
                <button onClick={() => setChildren(p => Math.min(6, p + 1))}
                  style={{ width: 32, height: 32, borderRadius: '50%', border: `1.5px solid ${O}`,
                    background: '#fff', color: O, fontSize: 18, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>+</button>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <button onClick={handleSearch}
                style={{ width: '100%', padding: '12px 0',
                  background: `linear-gradient(135deg,${O},${O2})`,
                  color: '#fff', border: 'none', borderRadius: 9,
                  fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: `0 4px 14px ${O}55` }}>
                Search Plans →
              </button>
            </div>
          </div>

          {/* Info strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8,
            background: '#fff8f0', border: `1px solid ${O}33`, borderRadius: 8, padding: '10px 16px' }}>
            <span style={{ fontSize: 16 }}>ℹ️</span>
            <span style={{ fontSize: 12, color: '#888' }}>
              All plans are IRDAI approved. Pre-existing conditions covered after 48-hour waiting period.
              Policy issued instantly on payment.
            </span>
          </div>
        </div>
      </div>

      {/* COVERAGE HIGHLIGHTS */}
      <div style={{ maxWidth: 900, margin: '0 auto 60px', padding: '0 20px' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e', marginBottom: 20, textAlign: 'center' }}>
          What's Covered
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {COVER_HIGHLIGHTS.map(c => (
            <div key={c.label} style={{ background: '#fff', borderRadius: 12, padding: '20px 22px',
              border: '1px solid #f0e8e0', boxShadow: '0 2px 10px rgba(0,0,0,.04)' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{c.icon}</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 11.5, color: '#888' }}>{c.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <CorpFooter />
    </div>
  );
}
