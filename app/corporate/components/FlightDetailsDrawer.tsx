'use client';
import { useState } from 'react';

const O  = '#f07820';
const O2 = '#e86d18';
const PK = '#c9184a';

export type FareDetailRow = { label: string; sub?: string; value: string; bold?: boolean };
export type BaggageRow    = { label: string; value: string };
// One baggage tile — one per leg (depart/return) when the flight has more than one direction.
export type BaggageLeg = {
  routeLabel: string;       // e.g. "DEL → CMB"
  directionLabel?: string;  // e.g. "DEPART" / "RETURN" — omitted for a single-leg (one-way) flight
  dateLabel?: string;       // e.g. "Thu, 22 Oct 26"
  checkIn: string;          // e.g. "30 Kg"
  cabin: string;            // e.g. "1Pc"
};

export default function FlightDetailsDrawer({
  onClose, routeLabel, fareRows, fareRules, baggageLegs, extraBaggageRows,
}: {
  onClose: () => void;
  routeLabel: string;
  fareRows: FareDetailRow[];
  fareRules: string[];
  baggageLegs: BaggageLeg[];
  extraBaggageRows?: BaggageRow[];
}) {
  const [tab, setTab] = useState<'fare' | 'baggage'>('fare');

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
      {/* Overlay */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(20,15,10,.55)' }} />

      {/* Drawer */}
      <div style={{ position: 'relative', width: 'min(920px, 96vw)', height: '100%',
        background: '#fff', boxShadow: '-8px 0 40px rgba(0,0,0,.2)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 28px', borderBottom: '1px solid #f0e8e8' }}>
          <h2 style={{ fontSize: 19, fontWeight: 800, color: '#1a1a2e', margin: 0 }}>Your Flight Details</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 22, color: '#888', lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '0 28px',
          borderBottom: '1px solid #f0e8e8' }}>
          <span style={{ fontSize: 14.5, fontWeight: 700, color: '#1a1a2e', padding: '14px 0' }}>
            {routeLabel}
          </span>
          {([
            ['fare', 'Fare Summary & Rules'],
            ['baggage', 'Baggage & Inclusions'],
          ] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              padding: '14px 2px', fontSize: 14, fontWeight: 700,
              color: tab === key ? '#1a1a2e' : '#999',
              borderBottom: tab === key ? `3px solid ${O}` : '3px solid transparent',
            }}>{label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '26px 28px' }}>
          {tab === 'fare' ? (
            <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap' }}>
              {/* Fare Details */}
              <div style={{ flex: '1 1 320px', minWidth: 280 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e', margin: '0 0 12px' }}>Fare Details</h3>
                <div style={{ border: '1px solid #f0e8e8', borderRadius: 10, overflow: 'hidden' }}>
                  {fareRows.map((r, i) => (
                    <div key={i} style={{ padding: '12px 16px',
                      borderBottom: i < fareRows.length - 1 ? '1px solid #f0e8e8' : 'none',
                      background: r.bold ? '#fff8f0' : '#fff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: r.bold ? 14.5 : 13, fontWeight: r.bold ? 800 : 600,
                          color: '#1a1a2e' }}>{r.label}</span>
                        <span style={{ fontSize: r.bold ? 15 : 13, fontWeight: r.bold ? 800 : 700,
                          color: r.bold ? O : '#1a1a2e' }}>{r.value}</span>
                      </div>
                      {r.sub && (
                        <div style={{ fontSize: 11.5, color: '#999', marginTop: 3 }}>{r.sub}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Fare Rules */}
              <div style={{ flex: '1 1 380px', minWidth: 280 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e', margin: '0 0 12px' }}>Fare Rules</h3>
                <div style={{ border: '1px solid #f0e8e8', borderRadius: 10, padding: '18px 20px' }}>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none',
                    display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {fareRules.map((rule, i) => (
                      <li key={i} style={{ fontSize: 13, color: '#555', lineHeight: 1.65, display: 'flex', gap: 6 }}>
                        <span style={{ color: PK, fontWeight: 800, flexShrink: 0 }}>*</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 540 }}>
              {baggageLegs.map((leg, i) => (
                <div key={i} style={{ border: '1px solid #f0e8e8', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 18px',
                    background: '#fafafa', borderBottom: '1px solid #f0e8e8' }}>
                    {(leg.directionLabel || leg.dateLabel) && (
                      <div style={{ fontSize: 10.5, fontWeight: 800, color: '#888', textTransform: 'uppercase',
                        letterSpacing: '.04em', lineHeight: 1.5, whiteSpace: 'nowrap' }}>
                        {leg.directionLabel}
                        {leg.directionLabel && leg.dateLabel && <br />}
                        {leg.dateLabel}
                      </div>
                    )}
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e' }}>{leg.routeLabel}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, padding: '18px 20px' }}>
                    <div style={{ fontSize: 32, lineHeight: 1, opacity: .85 }}>🧳</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1a2e' }}>Check-in</div>
                        <div style={{ fontSize: 12.5, color: '#999', marginTop: 2 }}>Adult : {leg.checkIn}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1a2e' }}>Cabin</div>
                        <div style={{ fontSize: 12.5, color: '#999', marginTop: 2 }}>Adult : {leg.cabin}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {extraBaggageRows && extraBaggageRows.length > 0 && (
                <div style={{ border: '1px solid #f0e8e8', borderRadius: 10, overflow: 'hidden' }}>
                  {extraBaggageRows.map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between',
                      padding: '13px 18px', borderBottom: i < extraBaggageRows.length - 1 ? '1px solid #f0e8e8' : 'none' }}>
                      <span style={{ fontSize: 13, color: '#666', fontWeight: 600 }}>{r.label}</span>
                      <span style={{ fontSize: 13, color: '#1a1a2e', fontWeight: 700 }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ background: '#fafafa', border: '1px solid #f0e8e8', borderRadius: 10,
                padding: '14px 18px', fontSize: 11.5, color: '#999', lineHeight: 1.6 }}>
                The information presented above is as obtained from the airline reservation system. Shree Kalyanam
                does not guarantee the accuracy of this information. The baggage allowance may vary according to
                stop-overs, connecting flights and changes in airline rules.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
