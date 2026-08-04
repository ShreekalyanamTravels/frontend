'use client';
import type { PriceChange } from '../../hooks/useFlightPriceCheck';

const O = '#f07820';

/* Small dismissible popup shown when useFlightPriceCheck() finds the live fare (re-checked
 * against /api/flights/search) no longer matches the price the user selected earlier in the
 * flow. Purely informational — it does not change any stored/payable amount on its own. */
export function PriceChangeNotice({ changes, onDismiss }: { changes: PriceChange[]; onDismiss: () => void }) {
  if (changes.length === 0) return null;

  const totalOld = changes.reduce((s, c) => s + c.oldPrice, 0);
  const totalNew = changes.reduce((s, c) => s + c.newPrice, 0);
  const increased = totalNew > totalOld;

  return (
    <div style={{
      position: 'fixed', top: 18, right: 18, zIndex: 2000, width: 320, maxWidth: 'calc(100vw - 36px)',
      background: '#fff', borderRadius: 12, border: `1.5px solid ${increased ? '#f5c0cc' : '#c8e6c9'}`,
      boxShadow: '0 10px 32px rgba(0,0,0,.16)', overflow: 'hidden',
      fontFamily: 'inherit', animation: 'priceNoticeIn .25s ease-out',
    }}>
      <style>{`@keyframes priceNoticeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }`}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', background: increased ? '#fce8ee' : '#e8f5e9' }}>
        <span style={{ fontSize: 12.5, fontWeight: 800, color: increased ? '#c9184a' : '#2d8a4e' }}>
          {increased ? '⚠ Fare Increased' : '✓ Fare Decreased'}
        </span>
        <button onClick={onDismiss} aria-label="Dismiss" style={{
          background: 'none', border: 'none', cursor: 'pointer', fontSize: 15,
          color: '#888', lineHeight: 1, padding: 2,
        }}>×</button>
      </div>
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 11.5, color: '#666', lineHeight: 1.5 }}>
          The airline has updated the fare since you selected this flight.
        </div>
        {changes.map(c => (
          <div key={c.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: 12, padding: '4px 0', borderTop: '1px dashed #eee' }}>
            <span style={{ color: '#555', fontWeight: 600 }}>{c.label}</span>
            <span>
              <span style={{ color: '#aaa', textDecoration: 'line-through', marginRight: 6 }}>
                ₹{c.oldPrice.toLocaleString()}
              </span>
              <span style={{ color: c.newPrice > c.oldPrice ? '#c9184a' : '#2d8a4e', fontWeight: 800 }}>
                ₹{c.newPrice.toLocaleString()}
              </span>
            </span>
          </div>
        ))}
        <button onClick={onDismiss} style={{
          marginTop: 4, padding: '8px 0', background: O, color: '#fff', border: 'none',
          borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          OK, Got It
        </button>
      </div>
    </div>
  );
}
