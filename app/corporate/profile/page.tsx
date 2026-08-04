'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Inter } from 'next/font/google';
import DashNav from '../components/DashNav';
import CorpFooter from '../components/CorpFooter';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { sanitizeCompanyName, sanitizeAlphanumeric, sanitizeDigits, sanitizeAddress, sanitizeLettersOnly } from '../../lib/textSanitize';

interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  address: string;
  accountType: string;
  status: string;
  corporateId: string | null;
  createdAt: string | null;
  companyName: string;
  gstNumber: string;
  panNumber: string;
  state: string;
  pincode: string;
}

const inter = Inter({ subsets:['latin'], weight:['400','500','600','700','800'] });

const O = '#f07820'; const O2 = '#e86d18';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background:'#fff', borderRadius:14, padding:'24px 28px',
      boxShadow:'0 4px 20px rgba(0,0,0,.07)' }}>
      <h3 style={{ fontSize:15, fontWeight:800, color:'#1a1a2e', margin:'0 0 20px',
        paddingBottom:12, borderBottom:'1.5px solid #f5f0ee' }}>{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', readOnly = false, half = false }:
  { label:string; value:string; onChange?:(v:string)=>void; type?:string; readOnly?:boolean; half?:boolean }) {
  return (
    <div style={{ flex: half ? '0 0 calc(50% - 8px)' : '1 1 100%' }}>
      <label style={{ fontSize:11, fontWeight:700, color:'#aaa', letterSpacing:'.08em',
        textTransform:'uppercase', display:'block', marginBottom:6 }}>{label}</label>
      <input
        type={type} value={value}
        onChange={e => onChange?.(e.target.value)}
        readOnly={readOnly}
        style={{
          width:'100%', padding:'10px 14px',
          border:`1.5px solid ${readOnly ? '#f0ebe5' : '#e8e2db'}`,
          borderRadius:9, fontSize:14, fontFamily:'inherit', color: readOnly ? '#aaa' : '#1a1a2e',
          outline:'none', background: readOnly ? '#faf9f8' : '#fff',
          boxSizing:'border-box', transition:'border-color .15s',
        }}
        onFocus={e => { if (!readOnly) e.target.style.borderColor = O; }}
        onBlur={e => { e.target.style.borderColor = readOnly ? '#f0ebe5' : '#e8e2db'; }}
      />
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: userLoading } = useCurrentUser();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Personal
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [phone,     setPhone]     = useState('');

  // Company
  const [company,  setCompany]  = useState('');
  const [gst,      setGst]      = useState('');
  const [pan,      setPan]      = useState('');
  const [address,  setAddress]  = useState('');
  const [state,    setState]    = useState('');
  const [pincode,  setPincode]  = useState('');

  // Account details (read-only, from DB)
  const [accountType, setAccountType] = useState('');
  const [status,      setStatus]      = useState('');
  const [memberSince, setMemberSince] = useState('');

  // Password
  const [curPwd,  setCurPwd]  = useState('');
  const [newPwd,  setNewPwd]  = useState('');
  const [confPwd, setConfPwd] = useState('');
  const [pwdError,   setPwdError]   = useState('');
  const [pwdSaved,   setPwdSaved]   = useState(false);
  const [pwdSaving,  setPwdSaving]  = useState(false);

  const pwdMatch = newPwd === confPwd;
  const pwdStrong = newPwd.length >= 8;

  useEffect(() => {
    if (!userLoading && !user) router.push('/');
  }, [userLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    fetch('/api/profile')
      .then(res => res.json())
      .then((data: { profile?: Profile }) => {
        const p = data.profile;
        if (!p) return;
        setFirstName(p.firstName);
        setLastName(p.lastName);
        setEmail(p.email);
        setPhone(p.mobile);
        setCompany(p.companyName);
        setGst(p.gstNumber);
        setPan(p.panNumber);
        setAddress(p.address);
        setState(p.state);
        setPincode(p.pincode);
        setAccountType(p.accountType);
        setStatus(p.status);
        setMemberSince(p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
      })
      .finally(() => setLoading(false));
  }, [user]);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handlePasswordUpdate() {
    setPwdError('');
    if (!curPwd || !newPwd || !confPwd) {
      setPwdError('Please fill in all password fields.');
      return;
    }
    if (!pwdStrong) {
      setPwdError('New password must be at least 8 characters.');
      return;
    }
    if (!pwdMatch) {
      setPwdError('New password and confirm password do not match.');
      return;
    }
    setPwdSaving(true);
    try {
      const res = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: curPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwdError(data.error ?? 'Failed to update password');
        return;
      }
      setCurPwd('');
      setNewPwd('');
      setConfPwd('');
      setPwdSaved(true);
      setTimeout(() => setPwdSaved(false), 3000);
    } catch {
      setPwdError('Something went wrong. Please try again.');
    } finally {
      setPwdSaving(false);
    }
  }

  return (
    <div className={inter.className} style={{ background:'#f9f2ec', minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      <DashNav title="Profile" />

      <main style={{ flex:1, padding:'36px 5% 60px' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>

          {/* Header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:28 }}>
            <div>
              <h1 style={{ fontSize:24, fontWeight:800, color:'#1a1a2e', margin:'0 0 4px', letterSpacing:'-.01em' }}>Profile</h1>
              <p style={{ fontSize:13, color:'#aaa', margin:0 }}>Manage your personal and company details</p>
            </div>
            {saved && (
              <div style={{
                padding:'10px 20px', background:'#e8f5e9', borderRadius:9,
                fontSize:13.5, fontWeight:700, color:'#2d8a4e',
                display:'flex', alignItems:'center', gap:7,
              }}>✓ Changes saved successfully</div>
            )}
          </div>

          {loading ? (
            <div style={{ padding:'60px 0', textAlign:'center', color:'#aaa', fontSize:14 }}>Loading profile…</div>
          ) : (
          <>
          {/* Avatar card */}
          <div style={{ background:'#fff', borderRadius:14, padding:'22px 28px',
            boxShadow:'0 4px 20px rgba(0,0,0,.07)', marginBottom:20,
            display:'flex', alignItems:'center', gap:22 }}>
            <div style={{
              width:80, height:80, borderRadius:'50%',
              background:`linear-gradient(135deg,${O},${O2})`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:34, flexShrink:0, boxShadow:`0 4px 20px ${O}44`,
            }}>👤</div>
            <div>
              <div style={{ fontSize:20, fontWeight:800, color:'#1a1a2e', marginBottom:4 }}>
                {firstName} {lastName}
              </div>
              <div style={{ fontSize:13.5, color:'#888', marginBottom:10 }}>{email}</div>
              <div style={{ display:'flex', gap:8 }}>
                <span style={{ padding:'4px 12px', background:`${O}18`, color:O,
                  borderRadius:18, fontSize:12, fontWeight:700 }}>Corporate Account</span>
                <span style={{ padding:'4px 12px', background:'#e8f5e9', color:'#2d8a4e',
                  borderRadius:18, fontSize:12, fontWeight:700 }}>✓ Verified</span>
              </div>
            </div>
            {user?.corporateId && (
              <div style={{ marginLeft:'auto' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#bbb', letterSpacing:'.08em',
                  textTransform:'uppercase', marginBottom:4 }}>Agent Code</div>
                <div style={{ fontSize:18, fontWeight:800, color:'#1a1a2e', fontFamily:'monospace',
                  letterSpacing:'.12em' }}>{user.corporateId}</div>
              </div>
            )}
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

            {/* Personal Info */}
            <Section title="Personal Information">
              <div style={{ display:'flex', flexWrap:'wrap', gap:16 }}>
                <Field label="First Name"   value={firstName} onChange={setFirstName} half />
                <Field label="Last Name"    value={lastName}  onChange={setLastName}  half />
                <Field label="Email Address" value={email}    onChange={setEmail}     half type="email" />
                <Field label="Mobile Number" value={phone}    onChange={setPhone}     half type="tel" />
              </div>
            </Section>

            {/* Company Info */}
            <Section title="Company Information">
              <div style={{ display:'flex', flexWrap:'wrap', gap:16 }}>
                <Field label="Company Name"  value={company}  onChange={v => setCompany(sanitizeCompanyName(v))} />
                <Field label="GST Number"    value={gst}      onChange={v => setGst(sanitizeAlphanumeric(v))}     half />
                <Field label="PAN Number"    value={pan}      onChange={v => setPan(sanitizeAlphanumeric(v))}     half />
                <Field label="Street Address" value={address} onChange={v => setAddress(sanitizeAddress(v))} />
                <Field label="State"         value={state}    onChange={v => setState(sanitizeLettersOnly(v))}   half />
                <Field label="PIN Code"      value={pincode}  onChange={v => setPincode(sanitizeDigits(v))} half />
              </div>
            </Section>

            {/* Account info (read-only) */}
            <Section title="Account Details">
              <div style={{ display:'flex', flexWrap:'wrap', gap:16 }}>
                <Field label="Account Type"   value={accountType || '—'} readOnly half />
                <Field label="Member Since"   value={memberSince || '—'} readOnly half />
                <Field label="Account Status" value={status || '—'}      readOnly half />
              </div>
            </Section>

            {/* Password */}
            <Section title="Change Password">
              <div style={{ display:'flex', flexWrap:'wrap', gap:16 }}>
                <Field label="Current Password" value={curPwd} onChange={setCurPwd} type="password" half />
                <div style={{ flex:'0 0 100%' }} />
                <Field label="New Password"     value={newPwd}  onChange={setNewPwd}  type="password" half />
                <Field label="Confirm Password" value={confPwd} onChange={setConfPwd} type="password" half />
              </div>
              {newPwd && (
                <div style={{ marginTop:12, display:'flex', gap:16, flexWrap:'wrap' }}>
                  <span style={{ fontSize:12.5, color: pwdStrong ? '#2d8a4e' : '#c9184a', fontWeight:600 }}>
                    {pwdStrong ? '✓' : '✗'} Min. 8 characters
                  </span>
                  {confPwd && (
                    <span style={{ fontSize:12.5, color: pwdMatch ? '#2d8a4e' : '#c9184a', fontWeight:600 }}>
                      {pwdMatch ? '✓' : '✗'} Passwords match
                    </span>
                  )}
                </div>
              )}
              {pwdError && (
                <div style={{ marginTop:14, fontSize:12.5, color:'#c9184a', background:'#fdeef1',
                  border:'1px solid #f3c6d0', borderRadius:8, padding:'9px 12px' }}>
                  {pwdError}
                </div>
              )}
              {pwdSaved && (
                <div style={{ marginTop:14, fontSize:12.5, color:'#2d8a4e', background:'#e8f5e9',
                  border:'1px solid #bfe3c3', borderRadius:8, padding:'9px 12px' }}>
                  ✓ Password updated successfully
                </div>
              )}
              <div style={{ marginTop:16 }}>
                <button onClick={handlePasswordUpdate} disabled={pwdSaving} style={{
                  padding:'11px 30px',
                  background:`linear-gradient(135deg,${O},${O2})`,
                  color:'#fff', border:'none', borderRadius:10,
                  fontSize:14, fontWeight:700, cursor: pwdSaving ? 'default' : 'pointer', fontFamily:'inherit',
                  boxShadow:`0 4px 16px ${O}44`, opacity: pwdSaving ? 0.7 : 1,
                }}>
                  {pwdSaving ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            </Section>

            {/* Save */}
            <div style={{ display:'flex', gap:12 }}>
              <button onClick={handleSave} style={{
                padding:'12px 36px',
                background:`linear-gradient(135deg,${O},${O2})`,
                color:'#fff', border:'none', borderRadius:10,
                fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit',
                boxShadow:`0 6px 24px ${O}55`,
              }}>Save Changes</button>
              <button style={{
                padding:'12px 24px', background:'#f5f0ee',
                color:'#666', border:'none', borderRadius:10,
                fontSize:15, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
              }}>Discard</button>
            </div>
          </div>
          </>
          )}
        </div>
      </main>

      <CorpFooter />
    </div>
  );
}
