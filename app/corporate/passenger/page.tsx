 'use client';
 import Link from 'next/link';
 import { Inter, Playfair_Display } from 'next/font/google';
 import BookingProgress from '../components/BookingProgress';

const inter    = Inter({ subsets:['latin'], weight:['400','500','600','700','800'] });
const playfair = Playfair_Display({ subsets:['latin'], weight:['700'], style:['italic'] });

export default function PassengerPage() {
  return (
    <div className={inter.className} style={{ background:'#fdf6f2', minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      <nav style={{ background:'linear-gradient(90deg,#111 0%,#1e1e1e 100%)', padding:'0 5%', height:58, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <Link href="/corporate/login" style={{ display:'flex', alignItems:'center', gap:9, textDecoration:'none' }}>
          <span style={{ fontSize:20 }}>🪷</span>
          <span className={playfair.className} style={{ fontSize:18, fontWeight:700, color:'#fff', fontStyle:'italic' }}>Kalyanam</span>
        </Link>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <span style={{ color:'#fff', fontWeight:700 }}>BD Balance: ₹0</span>
        </div>
      </nav>

      <div style={{ padding:'18px 0 0' }}>
        <BookingProgress step={3} />
      </div>

      {/* Hero */}
      <div style={{ background:'linear-gradient(90deg,#f07520,#e86d18)', padding:'28px 5%', color:'#fff', marginTop:12 }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h1 style={{ margin:0, fontSize:26, fontWeight:800 }}>Complete Your Booking</h1>
            <p style={{ margin: '8px 0 0', opacity:0.95 }}>Review itinerary, add traveller details, and confirm your trip securely.</p>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button style={{ padding:'8px 12px', borderRadius:8, background:'#fff', color:'#e86d18', fontWeight:700, border:'none' }}>Review Flight</button>
            <button style={{ padding:'8px 12px', borderRadius:8, background:'#fff', color:'#e86d18', fontWeight:700, border:'none' }}>Add Travellers</button>
          </div>
        </div>
      </div>

      <main style={{ flex:1, padding:'28px 5%' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', gap:20, alignItems:'flex-start' }}>
          {/* Left column */}
          <div style={{ flex:1 }}>
            {/* Flight summary card */}
            <div style={{ background:'#fff', borderRadius:10, padding:18, boxShadow:'0 2px 12px rgba(0,0,0,.06)', marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:800, color:'#1a1a2e' }}>Jaipur → New Delhi</div>
                  <div style={{ marginTop:8, color:'#666' }}>Friday, Jul 31 · Non Stop · 1h 5m</div>
                  <div style={{ marginTop:12, fontSize:13, color:'#444' }}>IndiGo · 6E-6492</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:12, color:'#888' }}>Total Fare</div>
                  <div style={{ fontSize:20, fontWeight:800, color:'#f07820' }}>₹3,279</div>
                </div>
              </div>
            </div>

            {/* Traveller Details */}
            <div style={{ background:'#fff', borderRadius:10, padding:18, boxShadow:'0 2px 12px rgba(0,0,0,.06)' }}>
              <h3 style={{ margin:0, fontSize:16, fontWeight:800, color:'#1a1a2e' }}>Traveller Details</h3>
              <p style={{ color:'#666', marginTop:8 }}>Important: Enter name as mentioned on your passport or Government approved ID.</p>

              {/* Adult section */}
              <div style={{ marginTop:14, border:'1px solid #f0e8e8', borderRadius:8, padding:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700 }}>ADULT (12+ yrs)</div>
                    <div style={{ fontSize:12, color:'#888', marginTop:6 }}>You have not added any adults to the list</div>
                  </div>
                  <div>
                    <button style={{ padding:'8px 12px', borderRadius:8, background:'linear-gradient(135deg,#f07820,#e86d18)', color:'#fff', border:'none', fontWeight:800 }}>+ ADD NEW ADULT</button>
                  </div>
                </div>
              </div>

              {/* Child section */}
              <div style={{ marginTop:12, border:'1px solid #f0e8e8', borderRadius:8, padding:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700 }}>CHILD (2-12 yrs)</div>
                    <div style={{ fontSize:12, color:'#888', marginTop:6 }}>You have not added any children to the list</div>
                  </div>
                  <div>
                    <button style={{ padding:'8px 12px', borderRadius:8, background:'#fff', color:'#f07820', border:'1px solid #f0782088', fontWeight:800 }}>+ ADD NEW CHILD</button>
                  </div>
                </div>
              </div>

              {/* Infant section */}
              <div style={{ marginTop:12, border:'1px solid #f0e8e8', borderRadius:8, padding:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700 }}>INFANT (0-2 yrs)</div>
                    <div style={{ fontSize:12, color:'#888', marginTop:6 }}>You have not added any infants to the list</div>
                  </div>
                  <div>
                    <button style={{ padding:'8px 12px', borderRadius:8, background:'#fff', color:'#f07820', border:'1px solid #f0782088', fontWeight:800 }}>+ ADD NEW INFANT</button>
                  </div>
                </div>
              </div>

              {/* Contact & Continue */}
              <div style={{ marginTop:18, borderTop:'1px solid #f0e8e8', paddingTop:14 }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>Booking Details Will Be Sent To</div>
                <div style={{ display:'flex', gap:10 }}>
                  <select style={{ padding:10, borderRadius:8, border:'1px solid #eee', minWidth:120 }} defaultValue="IN"> 
                    <option value="IN">INDIA +91</option>
                  </select>
                  <input placeholder="Enter Mobile Number" style={{ flex:1, padding:10, borderRadius:8, border:'1px solid #eee' }} />
                  <input placeholder="Enter Email Address" style={{ flex:1, padding:10, borderRadius:8, border:'1px solid #eee' }} />
                </div>

                <div style={{ display:'flex', justifyContent:'flex-end', marginTop:14 }}>
                  <Link href="/corporate/results" style={{ padding:'10px 16px', borderRadius:8, background:'#f0ece8', color:'#666', textDecoration:'none', fontWeight:700, marginRight:10 }}>Back</Link>
                  <Link href="/corporate/flight-details" style={{ padding:'10px 18px', borderRadius:8, background:'linear-gradient(135deg,#f07820,#e86d18)', color:'#fff', textDecoration:'none', fontWeight:800 }}>Continue</Link>
                </div>
              </div>
            </div>
          </div>

          {/* Right column Billing box */}
          <aside style={{ width:300 }}>
            <div style={{ background:'#fff', borderRadius:10, padding:18, boxShadow:'0 2px 12px rgba(0,0,0,.06)' }}>
              <div style={{ fontSize:14, fontWeight:800, color:'#1a1a2e' }}>Billing Details</div>
              <div style={{ marginTop:12, display:'flex', justifyContent:'space-between', color:'#666' }}>
                <div>Base Fare</div>
                <div>₹2,879</div>
              </div>
              <div style={{ marginTop:8, display:'flex', justifyContent:'space-between', color:'#666' }}>
                <div>Taxes</div>
                <div>₹400</div>
              </div>
              <div style={{ height:1, background:'#f0e8e8', margin:'12px 0' }} />
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:18, fontWeight:800, color:'#f07820' }}>
                <div>Total Amount</div>
                <div>₹3,279</div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
