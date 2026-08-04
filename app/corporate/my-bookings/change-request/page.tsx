'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Inter } from 'next/font/google';
import DashNav from '../../components/DashNav';
import CorpFooter from '../../components/CorpFooter';
import { useCurrentUser } from '../../../hooks/useCurrentUser';

const inter = Inter({ subsets: ['latin'], weight: ['400','500','600','700','800'] });
const O  = '#f07820';
const O2 = '#e86d18';

const REQUEST_TYPES = ['Reschedule', 'Name Correction', 'Cancellation', 'Other'];

interface Sector { id: number; route: string; date: string | null; }
interface Passenger { id: number; name: string; }

function ChangeRequestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref') ?? '';
  const { user, loading: userLoading } = useCurrentUser();

  const [loading, setLoading] = useState(true);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);

  const [requestType, setRequestType] = useState(REQUEST_TYPES[0]);
  const [sectorIds, setSectorIds] = useState<Set<number>>(new Set());
  const [passengerIds, setPassengerIds] = useState<Set<number>>(new Set());
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) router.push('/');
  }, [userLoading, user, router]);

  useEffect(() => {
    if (!user || !ref) return;
    fetch(`/api/bookings/${encodeURIComponent(ref)}`)
      .then(res => res.json())
      .then(data => {
        setSectors(data.sectors ?? []);
        setPassengers(data.passengers ?? []);
      })
      .finally(() => setLoading(false));
  }, [user, ref]);

  function toggle(set: Set<number>, setFn: (s: Set<number>) => void, id: number) {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    setFn(next);
  }

  async function handleSubmit() {
    setError('');
    if (!remarks.trim()) {
      setError('Please describe the change you need.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(ref)}/change-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType,
          remarks,
          sectorIds: [...sectorIds],
          passengerIds: [...passengerIds],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to submit request.');
        return;
      }
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={inter.className} style={{ background: '#f9f2ec', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <DashNav title="Change Request" />

      <main style={{ flex: 1, padding: '36px 5% 60px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>

          <div style={{ marginBottom: 22 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e', margin: '0 0 4px' }}>Request a Change</h1>
            <p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>Booking Ref: <strong style={{ color: '#666' }}>{ref}</strong></p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#aaa' }}>Loading…</div>
          ) : submitted ? (
            <div style={{ background: '#e8f5e9', border: '1px solid #bfe3c3', borderRadius: 14, padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#2d8a4e', marginBottom: 6 }}>✓ Request Submitted</div>
              <p style={{ fontSize: 13, color: '#3a6b47', margin: '0 0 16px' }}>
                Our team will review your change request and get back to you shortly.
              </p>
              <Link href="/corporate/my-bookings" style={{ color: O, fontWeight: 700, fontSize: 13.5, textDecoration: 'none' }}>
                ← Back to My Bookings
              </Link>
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 14, padding: '24px 26px', boxShadow: '0 4px 20px rgba(0,0,0,.08)' }}>

              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: '.08em',
                  textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Request Type</label>
                <select value={requestType} onChange={e => setRequestType(e.target.value)} style={{
                  width: '100%', padding: '10px 14px', border: '1.5px solid #e8e2db', borderRadius: 9,
                  fontSize: 14, fontFamily: 'inherit', color: '#1a1a2e', outline: 'none', background: '#fff',
                }}>
                  {REQUEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {sectors.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: '.08em',
                    textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Affected Sectors</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {sectors.map(s => (
                      <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13.5 }}>
                        <input type="checkbox" checked={sectorIds.has(s.id)}
                          onChange={() => toggle(sectorIds, setSectorIds, s.id)}
                          style={{ accentColor: O, width: 14, height: 14, cursor: 'pointer' }} />
                        <span>{s.route} — {s.date}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {passengers.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: '.08em',
                    textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Affected Passengers</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {passengers.map(p => (
                      <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13.5 }}>
                        <input type="checkbox" checked={passengerIds.has(p.id)}
                          onChange={() => toggle(passengerIds, setPassengerIds, p.id)}
                          style={{ accentColor: O, width: 14, height: 14, cursor: 'pointer' }} />
                        <span>{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: '.08em',
                  textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Remarks</label>
                <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={4}
                  placeholder="Describe the change you need…"
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e2db', borderRadius: 9,
                    fontSize: 14, fontFamily: 'inherit', color: '#1a1a2e', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>

              {error && (
                <div style={{ fontSize: 12.5, color: '#c9184a', background: '#fdeef1', border: '1px solid #f3c6d0',
                  borderRadius: 8, padding: '9px 12px', marginBottom: 16 }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={handleSubmit} disabled={submitting} style={{
                  padding: '12px 30px', background: `linear-gradient(135deg,${O},${O2})`, color: '#fff',
                  border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
                  cursor: submitting ? 'default' : 'pointer', fontFamily: 'inherit', opacity: submitting ? 0.7 : 1,
                }}>
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </button>
                <Link href="/corporate/my-bookings" style={{
                  padding: '12px 24px', background: '#f5f0ee', color: '#666', border: 'none', borderRadius: 10,
                  fontSize: 14, fontWeight: 600, fontFamily: 'inherit', textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
                }}>
                  Cancel
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <CorpFooter />
    </div>
  );
}

export default function ChangeRequestPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#f9f2ec' }} />}>
      <ChangeRequestContent />
    </Suspense>
  );
}
