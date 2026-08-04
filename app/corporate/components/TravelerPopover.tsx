'use client';
import { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

export interface TravelerEntry { dob: string; relationship: string }
export const RELATIONSHIPS = ['FATHER', 'MOTHER', 'SON', 'SISTER', 'DAUGHTER', 'SPOUSE', 'BROTHER', 'SELF'];

/* Per-traveler collector used by Family Floater (2–6 travelers, each with a relationship + DOB)
 * across the dashboard's insurance search and the plans page's editable search bar.
 * `countOptions` drives the in-popover count buttons (a single-value array just shows the fixed
 * count with no picker). */
export function TravelerPopover({ countOptions, count, onCountChange, travelers, onChange, showRelationship, showErrors }: {
  countOptions: number[];
  count: number;
  onCountChange: (n: number) => void;
  travelers: TravelerEntry[];
  onChange: (travelers: TravelerEntry[]) => void;
  showRelationship: boolean;
  /** Only surface "required" errors once the user has tried to submit — not on first render. */
  showErrors?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const active = travelers.slice(0, count);
  const allFilled = active.every(t => t.dob && (!showRelationship || t.relationship));
  const maxCount = Math.max(...countOptions);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ left: number; top?: number; bottom?: number }>({ left: 0 });

  // Anchored via a portal to document.body (fixed positioning) rather than an absolutely
  // positioned child, since this control can sit inside a row with `overflow: hidden` (for its
  // rounded corners) that would otherwise clip the popover panel. Prefers opening upward (so it
  // doesn't spill over a button below it) but flips to downward when there isn't enough room
  // above the anchor — e.g. a search bar sitting right under the page header.
  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceAbove >= 300 || spaceAbove >= spaceBelow) {
      setPanelPos({ bottom: window.innerHeight - rect.top + 10, left: rect.left });
    } else {
      setPanelPos({ top: rect.bottom + 10, left: rect.left });
    }
  }, [open]);

  function setTraveler(i: number, patch: Partial<TravelerEntry>) {
    const next = [...travelers];
    next[i] = { ...(next[i] ?? { dob: '', relationship: '' }), ...patch };
    onChange(next);
  }

  return (
    <div ref={anchorRef} style={{ position:'relative' }}>
      {allFilled ? (
        <div onClick={() => setOpen(p => !p)}
          style={{ fontSize:11, color:'#2d8a4e', fontWeight:700, cursor:'pointer' }}>
          ✓ {count} Traveler{count !== 1 ? 's' : ''} Added
        </div>
      ) : showErrors ? (
        <div onClick={() => setOpen(p => !p)}
          style={{ display:'inline-flex', alignItems:'center', cursor:'pointer',
            background:'#c0392b', borderRadius:5, padding:'3px 9px' }}>
          <span style={{ fontSize:9.5, fontWeight:700, color:'#fff', letterSpacing:'.02em' }}>
            *Date of Birth is required
          </span>
        </div>
      ) : (
        <div onClick={() => setOpen(p => !p)}
          style={{ display:'inline-flex', alignItems:'center', gap:5, cursor:'pointer', color:'#666' }}>
          <span style={{ fontSize:14 }}>📅</span>
          <span style={{ fontSize:12, fontWeight:600 }}>Date of Birth</span>
        </div>
      )}

      {open && createPortal(
        <>
          <div onClick={() => setOpen(false)} style={{ position:'fixed', inset:0, zIndex:399 }} />
          <div style={{
            position:'fixed', top:panelPos.top, bottom:panelPos.bottom, left:panelPos.left,
            background:'#fff', borderRadius:14, zIndex:400, width:320,
            maxHeight:'calc(100vh - 20px)', display:'flex', flexDirection:'column',
            boxShadow:'0 12px 48px rgba(0,0,0,.15), 0 2px 8px rgba(0,0,0,.06)',
            border:'1px solid #f0ebe5', overflow:'hidden',
          }}>
            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 16px',
              background:'#fff4e0', borderBottom:'1px solid #f5e8d0' }}>
              <span style={{ fontSize:14 }}>ⓘ</span>
              <span style={{ fontSize:12.5, fontWeight:700, color:'#a15c00' }}>
                Traveler (Max.{maxCount} traveler{maxCount !== 1 ? 's' : ''})
              </span>
            </div>

            <div style={{ padding:16, maxHeight:380, overflowY:'auto' }}>
              {/* Count picker */}
              {countOptions.length > 1 && (
                <div style={{ display:'flex', gap:6, marginBottom:16 }}>
                  {countOptions.map(n => (
                    <button key={n} type="button" onClick={() => onCountChange(n)} style={{
                      width:32, height:28, borderRadius:6,
                      border: n === count ? 'none' : '1px solid #ddd',
                      background: n === count ? '#a8c93a' : '#fff',
                      color: n === count ? '#fff' : '#555',
                      fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit',
                    }}>{n}</button>
                  ))}
                </div>
              )}

              {Array.from({ length: count }, (_, i) => {
                const t = travelers[i] ?? { dob: '', relationship: '' };
                const isLead = i === 0;
                return (
                  <div key={i} style={{ marginBottom: i < count - 1 ? 16 : 0 }}>
                    <div style={{ fontSize:12.5, fontWeight:700, color:'#1a1a2e', marginBottom:6 }}>
                      Traveler {i + 1}
                    </div>
                    <div style={{ display:'grid',
                      gridTemplateColumns: showRelationship ? '1fr 1fr' : '1fr', gap:8 }}>
                      {showRelationship && (
                        isLead ? (
                          <div style={{ padding:'9px 12px', border:'1.5px solid #ddd', borderRadius:8,
                            fontSize:13, color:'#1a1a2e', fontWeight:700, background:'#f7f7f7',
                            boxSizing:'border-box' }}>SELF</div>
                        ) : (
                          <select value={t.relationship}
                            onChange={e => setTraveler(i, { relationship: e.target.value })}
                            style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #ddd',
                              borderRadius:8, fontSize:13, color: t.relationship ? '#1a1a2e' : '#999',
                              fontFamily:'inherit', outline:'none', appearance:'none', cursor:'pointer',
                              boxSizing:'border-box' }}>
                            <option value="">Relationship*</option>
                            {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        )
                      )}
                      <input type="date" value={t.dob}
                        onChange={e => setTraveler(i, { dob: e.target.value })}
                        style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #ddd',
                          borderRadius:8, fontSize:13, color:'#1a1a2e', fontFamily:'inherit',
                          outline:'none', boxSizing:'border-box' }} />
                    </div>
                    {!t.dob && (
                      showErrors ? (
                        <div style={{ marginTop:5, background:'#c0392b', borderRadius:5,
                          padding:'3px 9px', display:'inline-block' }}>
                          <span style={{ fontSize:9.5, fontWeight:700, color:'#fff' }}>
                            *Date of Birth is required
                          </span>
                        </div>
                      ) : (
                        <div style={{ marginTop:4, fontSize:9.5, color:'#aaa', fontWeight:600 }}>
                          * mandatory
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
