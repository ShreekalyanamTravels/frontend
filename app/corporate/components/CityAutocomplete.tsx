'use client';
import { useState, useRef, useEffect } from 'react';

export interface CityOption { code:string; name:string; city:string; country:string; countryCode:string }

export function CityAutocomplete({ value, onChange, placeholder, inputStyle, inputClassName }:
  { value:string; onChange:(v:string, opt?:CityOption)=>void; placeholder?:string; inputStyle?:React.CSSProperties; inputClassName?:string }) {
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
    <div ref={boxRef} style={{ position:'relative', width:'100%' }}>
      <input
        className={inputClassName}
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        style={{ border:'none', outline:'none', width:'100%', background:'transparent', ...inputStyle }}
      />

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
    </div>
  );
}
