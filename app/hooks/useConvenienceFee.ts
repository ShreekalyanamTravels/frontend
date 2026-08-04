'use client';
import { useState, useEffect } from 'react';

/* Single shared implementation of the convenience-fee fetch — used by payment-details (real
 * selected payment mode) and by review-booking/passenger-details (a UPI preview, since the mode
 * isn't chosen until the payment step). Pass paymentModeId=null to skip the fetch entirely
 * (e.g. Creditpool, which never gets a convenience fee) and force the result to 0. */
export function useConvenienceFee(paymentModeId: string | null, sector: string, amount: number): number {
  const [convenienceFee, setConvenienceFee] = useState(0);

  useEffect(() => {
    if (!paymentModeId || !amount) { setConvenienceFee(0); return; }
    let cancelled = false;
    fetch(`/api/convenience-fee?paymentMode=${paymentModeId}&sector=${sector}&amount=${amount}`)
      .then(res => res.json())
      .then(data => { if (!cancelled) setConvenienceFee(Number(data.convenienceFee) || 0); })
      .catch(() => { if (!cancelled) setConvenienceFee(0); });
    return () => { cancelled = true; };
  }, [paymentModeId, sector, amount]);

  return convenienceFee;
}
