'use client';

const O = '#f07820';

const STEPS = [
  { n:1, label:'Flight Search'        },
  { n:2, label:'Flight Results'       },
  { n:3, label:'Passenger Details'    },
  { n:4, label:'Review Booking'       },
  { n:5, label:'Payment Details'      },
  { n:6, label:'Booking Confirmation' },
];

export default function BookingProgress({ step }: { step: number }) {
  const N = STEPS.length; // 6
  // Each step occupies 1/N of the row. Circle centers sit at 1/(2N), 3/(2N), ... of total width.
  // Track runs from center of step-1 to center of step-N.
  const edgePct   = 100 / (2 * N);                              // 8.333…%
  const spanPct   = 100 - 2 * edgePct;                          // 83.333…%
  const fillPct   = edgePct + ((step - 1) / (N - 1)) * spanPct; // left edge of white line end-point
  const widthPct  = Math.max(0, fillPct - edgePct);             // width of white segment

  return (
    <div style={{
      background:`linear-gradient(135deg,${O} 0%,#e86d18 100%)`,
      borderRadius:10, padding:'12px 20px 10px',
      margin:'0 5% 0', overflow:'hidden',
    }}>
      {/* outer padding — kept separate from position:relative so top:15 = exact circle center (30px/2) */}
      <div style={{ position:'relative' }}>
        {/* grey track */}
        <div style={{ position:'absolute', left:`${edgePct}%`, right:`${edgePct}%`,
          top:15, transform:'translateY(-50%)',
          height:2, background:'rgba(255,255,255,.3)', borderRadius:999 }} />
        {/* white fill */}
        <div style={{ position:'absolute', left:`${edgePct}%`,
          top:15, transform:'translateY(-50%)',
          height:2, width:`${widthPct}%`,
          background:'rgba(255,255,255,.95)', borderRadius:999,
          transition:'width .3s ease' }} />

        <div style={{ display:'flex', justifyContent:'space-between', gap:0, position:'relative', zIndex:2 }}>
          {STEPS.map((s) => {
            const done = s.n < step;
            const current = s.n === step;
            return (
              <div key={s.n} style={{ flex:'1 1 0', minWidth:0, display:'flex', flexDirection:'column', alignItems:'center', padding:'0 4px' }}>
                <div style={{
                  width:30, height:30, borderRadius:'50%', flexShrink:0,
                  background: done || current ? '#fff' : 'rgba(255,255,255,.35)',
                  border: current ? '2.5px solid rgba(255,255,255,.9)' : '2px solid rgba(255,255,255,.75)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow: current ? '0 0 0 3px rgba(255,255,255,.25)' : done ? '0 2px 6px rgba(0,0,0,.12)' : 'none',
                  transition:'all .2s',
                }}>
                  {done ? (
                    <svg width="12" height="10" viewBox="0 0 16 13" fill="none">
                      <path d="M1.5 6.5L5.5 10.5L14 2" stroke={O} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <span style={{
                      fontSize:12, fontWeight:800,
                      color: current ? O : 'rgba(255,255,255,.85)',
                      lineHeight:1,
                    }}>{s.n}</span>
                  )}
                </div>
                <span style={{
                  marginTop:6, fontSize:10, fontWeight: current ? 700 : 500,
                  color: done || current ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.75)',
                  letterSpacing:'.01em', textAlign:'center', whiteSpace:'nowrap',
                  overflow:'hidden', textOverflow:'ellipsis', width:'100%',
                }}>{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
