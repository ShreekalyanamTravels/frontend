'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Inter } from 'next/font/google';
import DashNav from '../components/DashNav';
import CorpFooter from '../components/CorpFooter';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { sanitizeCompanyName, sanitizeAlphanumeric, sanitizeDigits, sanitizeAddress } from '../../lib/textSanitize';

const inter = Inter({ subsets:['latin'], weight:['400','500','600','700','800'] });
const O = '#f07820';

interface GstEntry {
  id: number;
  companyName: string | null;
  registrationNo: string | null;
  gstNumber: string | null;
  pincode: string | null;
  stateId: number | null;
  stateName: string | null;
  address: string | null;
  createdAt: string;
}
interface StateOption { id: number; name: string }

function Input({ label, value, onChange, placeholder = '', required = false, invalid = false, maxLength }:
  { label:string; value:string; onChange:(v:string)=>void; placeholder?:string; required?:boolean; invalid?:boolean; maxLength?:number }) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <label style={{ fontSize:12.5, fontWeight:600, color:'#555' }}>{label}{required ? ' *' : ''}</label>
      <input
        value={value} placeholder={placeholder} maxLength={maxLength}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          padding:'10px 14px', border:`1.5px solid ${invalid ? '#c9184a' : focus ? O : '#f0c080'}`,
          borderRadius:8, fontSize:14, fontFamily:'inherit', color:'#1a1a2e',
          outline:'none', background: invalid ? '#fff8f8' : '#fff', boxSizing:'border-box', width:'100%',
        }}
      />
    </div>
  );
}

export default function GstDetailsPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useCurrentUser();

  const [companyName,   setCompanyName]   = useState('');
  const [registrationNo,setRegistrationNo]= useState('');
  const [gstNumber,     setGstNumber]     = useState('');
  const [pincode,       setPincode]       = useState('');
  const [stateId,       setStateId]       = useState('');
  const [address,       setAddress]       = useState('');

  const [states,     setStates]     = useState<StateOption[]>([]);
  const [gsts,        setGsts]        = useState<GstEntry[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState(false);
  const [editingId,   setEditingId]   = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<GstEntry | null>(null);
  const [deleting,    setDeleting]    = useState(false);
  const [showFieldErrors, setShowFieldErrors] = useState(false);

  const fieldsComplete = !!(companyName.trim() && registrationNo.trim() && gstNumber.trim()
    && pincode.trim() && stateId && address.trim());

  useEffect(() => {
    if (!userLoading && !user) router.push('/');
  }, [userLoading, user, router]);

  async function fetchGsts() {
    setLoading(true);
    try {
      const res = await fetch('/api/gst-details');
      const data = await res.json();
      setGsts(data.gsts ?? []);
      setStates(data.states ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) fetchGsts();
  }, [user]);

  function handleReset() {
    setCompanyName(''); setRegistrationNo(''); setGstNumber('');
    setPincode(''); setStateId(''); setAddress('');
    setEditingId(null);
    setShowFieldErrors(false);
  }

  function handleEdit(g: GstEntry) {
    setEditingId(g.id);
    setCompanyName(g.companyName ?? '');
    setRegistrationNo(g.registrationNo ?? '');
    setGstNumber(g.gstNumber ?? '');
    setPincode(g.pincode ?? '');
    setStateId(g.stateId ? String(g.stateId) : '');
    setAddress(g.address ?? '');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit() {
    setError('');
    if (!fieldsComplete) {
      setShowFieldErrors(true);
      setError('All fields are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/gst-details', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          companyName, registrationNo, gstNumber, pincode,
          stateId: stateId || null, address,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to save GST details.');
        return;
      }
      handleReset();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      fetchGsts();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmAndDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await fetch(`/api/gst-details?id=${confirmDelete.id}`, { method: 'DELETE' });
      if (editingId === confirmDelete.id) handleReset();
      setConfirmDelete(null);
      fetchGsts();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={inter.className} style={{ background:'#f7f3ef', minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      <DashNav title="GST Details" />

      <main style={{ flex:1, padding:'28px 4% 60px' }}>

        {/* ── Add GST form ── */}
        <div style={{ background:'#fff', borderRadius:10, boxShadow:'0 2px 12px rgba(0,0,0,.07)', marginBottom:28, overflow:'hidden' }}>
          <div style={{ background:'#f0f0f0', padding:'13px 22px', borderBottom:'1px solid #e8e2db' }}>
            <span style={{ fontSize:15, fontWeight:700, color:'#1a1a2e' }}>
              {editingId ? 'Edit Company GST' : 'Add Company GST'}
            </span>
          </div>

          <div style={{ padding:'24px 28px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:18, marginBottom:18 }}>
              <Input label="Company Name" required value={companyName}
                onChange={v => setCompanyName(sanitizeCompanyName(v))} placeholder="Enter Company Name"
                invalid={showFieldErrors && !companyName.trim()} />
              <Input label="Registration No" required value={registrationNo}
                onChange={v => setRegistrationNo(sanitizeAlphanumeric(v))} placeholder="Enter Registration No"
                invalid={showFieldErrors && !registrationNo.trim()} />
              <Input label="GST" required value={gstNumber} maxLength={15}
                onChange={v => setGstNumber(sanitizeAlphanumeric(v))} placeholder="Enter GST No"
                invalid={showFieldErrors && !gstNumber.trim()} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:18, marginBottom:18 }}>
              <Input label="Pin Code" required value={pincode} maxLength={6}
                onChange={v => setPincode(sanitizeDigits(v))} placeholder="Enter Pin Code"
                invalid={showFieldErrors && !pincode.trim()} />
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <label style={{ fontSize:12.5, fontWeight:600, color:'#555' }}>State *</label>
                <select value={stateId} onChange={e => setStateId(e.target.value)} style={{
                  padding:'10px 14px', border:`1.5px solid ${showFieldErrors && !stateId ? '#c9184a' : '#f0c080'}`,
                  borderRadius:8, fontSize:14, fontFamily:'inherit', color:'#1a1a2e',
                  outline:'none', background: showFieldErrors && !stateId ? '#fff8f8' : '#fff',
                  boxSizing:'border-box', width:'100%', cursor:'pointer',
                }}>
                  <option value="">Select State</option>
                  {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <Input label="Address" required value={address}
                onChange={v => setAddress(sanitizeAddress(v))} placeholder="Enter Address"
                invalid={showFieldErrors && !address.trim()} />
            </div>

            {error && (
              <div style={{ fontSize:13, color:'#c9184a', background:'#fdeef1', border:'1px solid #f3c6d0',
                borderRadius:8, padding:'9px 14px', marginBottom:16 }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{ fontSize:13, color:'#2d8a4e', background:'#e8f5e9', border:'1px solid #bfe3c3',
                borderRadius:8, padding:'9px 14px', marginBottom:16 }}>
                ✓ GST details saved successfully.
              </div>
            )}

            <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
              <button onClick={handleSubmit} disabled={submitting} style={{
                padding:'9px 28px', background:O, color:'#fff',
                border:'none', borderRadius:8, fontSize:14, fontWeight:700,
                cursor: submitting ? 'default' : 'pointer', fontFamily:'inherit', opacity: submitting ? 0.7 : 1,
              }}>{submitting ? (editingId ? 'Updating…' : 'Saving…') : (editingId ? 'Update' : 'Save')}</button>
              <button onClick={handleReset} style={{
                padding:'9px 24px', background:'#fff', color:O,
                border:`1.5px solid ${O}`, borderRadius:8, fontSize:14, fontWeight:700,
                cursor:'pointer', fontFamily:'inherit',
              }}>{editingId ? 'Cancel' : 'Reset'}</button>
            </div>
          </div>
        </div>

        {/* ── Saved GST list ── */}
        <div style={{ background:'#fff', borderRadius:10, boxShadow:'0 2px 12px rgba(0,0,0,.07)', overflow:'hidden' }}>
          <div style={{ background:'#f0f0f0', padding:'13px 22px', borderBottom:'1px solid #e8e2db' }}>
            <span style={{ fontSize:15, fontWeight:700, color:'#1a1a2e' }}>Saved GST Details</span>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr 1.2fr 0.8fr 1fr 1.6fr 0.9fr',
            padding:'12px 22px', background:'#fdf6ec', borderBottom:'1px solid #f0ebe5' }}>
            {['Company Name','Registration No','GST','Pin Code','State','Address',''].map(h => (
              <div key={h} style={{ fontSize:12.5, fontWeight:700, color:O }}>{h}</div>
            ))}
          </div>

          {loading ? (
            <div style={{ padding:'40px 22px', textAlign:'center', color:'#bbb', fontSize:14 }}>Loading…</div>
          ) : gsts.length === 0 ? (
            <div style={{ padding:'40px 22px', textAlign:'center', color:'#bbb', fontSize:14 }}>No GST details saved yet.</div>
          ) : gsts.map((g, i) => (
            <div key={g.id}
              onMouseEnter={e => (e.currentTarget.style.background = '#fdf9f7')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr 1.2fr 0.8fr 1fr 1.6fr 0.9fr',
                padding:'13px 22px', alignItems:'center',
                borderBottom: i < gsts.length - 1 ? '1px solid #f5f0ee' : 'none' }}>
              <div style={{ fontSize:13.5, fontWeight:600, color:'#1a1a2e' }}>{g.companyName || '—'}</div>
              <div style={{ fontSize:13, color:'#555' }}>{g.registrationNo || '—'}</div>
              <div style={{ fontSize:13, color:'#555' }}>{g.gstNumber || '—'}</div>
              <div style={{ fontSize:13, color:'#555' }}>{g.pincode || '—'}</div>
              <div style={{ fontSize:13, color:'#555' }}>{g.stateName || '—'}</div>
              <div style={{ fontSize:13, color:'#555' }}>{g.address || '—'}</div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => handleEdit(g)} title="Edit" style={{
                  display:'flex', alignItems:'center', gap:5,
                  padding:'6px 12px', background:`${O}14`, border:`1.5px solid ${O}44`,
                  borderRadius:20, cursor:'pointer', color:O, fontSize:12, fontWeight:700,
                  fontFamily:'inherit', transition:'all .15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = O; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = `${O}14`; e.currentTarget.style.color = O; }}
                >✏️ Edit</button>
                <button onClick={() => setConfirmDelete(g)} title="Delete" style={{
                  display:'flex', alignItems:'center', gap:5,
                  padding:'6px 12px', background:'#fdeef1', border:'1.5px solid #f3c6d0',
                  borderRadius:20, cursor:'pointer', color:'#c9184a', fontSize:12, fontWeight:700,
                  fontFamily:'inherit', transition:'all .15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#c9184a'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fdeef1'; e.currentTarget.style.color = '#c9184a'; }}
                >🗑️ Delete</button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* ── Delete confirmation modal ── */}
      {confirmDelete && (
        <div onClick={() => !deleting && setConfirmDelete(null)} style={{
          position:'fixed', inset:0, background:'rgba(20,15,12,.45)', backdropFilter:'blur(2px)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background:'#fff', borderRadius:16, padding:'28px 30px', width:380, maxWidth:'90vw',
            boxShadow:'0 20px 60px rgba(0,0,0,.25)', textAlign:'center',
          }}>
            <div style={{
              width:52, height:52, borderRadius:'50%', background:'#fdeef1',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:24, margin:'0 auto 16px',
            }}>🗑️</div>
            <div style={{ fontSize:16.5, fontWeight:800, color:'#1a1a2e', marginBottom:8 }}>
              Delete this GST record?
            </div>
            <div style={{ fontSize:13, color:'#777', lineHeight:1.6, marginBottom:24 }}>
              <strong style={{ color:'#1a1a2e' }}>{confirmDelete.companyName || 'This GST detail'}</strong> will be
              permanently removed. This action cannot be undone.
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button onClick={() => setConfirmDelete(null)} disabled={deleting} style={{
                padding:'10px 24px', background:'#fff', color:'#555',
                border:'1.5px solid #e0dad3', borderRadius:9, fontSize:13.5, fontWeight:700,
                cursor: deleting ? 'default' : 'pointer', fontFamily:'inherit',
              }}>Cancel</button>
              <button onClick={confirmAndDelete} disabled={deleting} style={{
                padding:'10px 26px', background:'#c9184a', color:'#fff',
                border:'none', borderRadius:9, fontSize:13.5, fontWeight:700,
                cursor: deleting ? 'default' : 'pointer', fontFamily:'inherit',
                opacity: deleting ? 0.7 : 1,
              }}>{deleting ? 'Deleting…' : 'Yes, Delete'}</button>
            </div>
          </div>
        </div>
      )}

      <CorpFooter />
    </div>
  );
}
