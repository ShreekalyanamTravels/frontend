'use client';
import { useEffect, useRef, useState } from 'react';

export interface PriceCheckLeg {
  key: string;      // 'out' | 'ret' | 'leg0' ...
  label: string;     // display label, e.g. "Jaipur → New Delhi"
  yatraId: string;
  price: number;      // the fare shown/stored for this leg at selection time
}

export interface PriceChange {
  key: string;
  label: string;
  oldPrice: number;
  newPrice: number;
}

interface FareOption { yatraId: string; price: number }
interface FlightResult { fareOptions?: FareOption[] }
interface SearchLeg { flights?: FlightResult[] }
interface SearchResponse { status?: boolean; legs?: SearchLeg[] }

/* Re-runs the exact /api/flights/search query the user's original search used (carried through
 * as the `origSearch` URL param since results/page.tsx) and compares the live fare for each
 * selected flight (matched by yatraId) against the price stored at selection time. Runs once per
 * page load — used on every step between flight selection and payment (passenger-details,
 * review-booking, payment-details) so a fare change surfaces wherever the user currently is. */
export function useFlightPriceCheck(origSearch: string | null, legs: PriceCheckLeg[]) {
  const [changes, setChanges] = useState<PriceChange[]>([]);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    if (!origSearch || legs.length === 0) return;
    checkedRef.current = true;

    fetch(`/api/flights/search?${origSearch}`)
      .then(res => res.json())
      .then((data: SearchResponse) => {
        if (data?.status === false || !Array.isArray(data.legs)) return;
        const found: PriceChange[] = [];
        legs.forEach((leg, i) => {
          const routeLeg = data.legs?.[i];
          if (!routeLeg) return;
          let currentPrice: number | null = null;
          for (const flight of routeLeg.flights ?? []) {
            const opt = (flight.fareOptions ?? []).find(o => o.yatraId === leg.yatraId);
            if (opt) { currentPrice = opt.price; break; }
          }
          if (currentPrice != null && currentPrice !== leg.price) {
            found.push({ key: leg.key, label: leg.label, oldPrice: leg.price, newPrice: currentPrice });
          }
        });
        if (found.length > 0) setChanges(found);
      })
      .catch(() => {});
  }, [origSearch, legs]);

  return { changes, dismiss: () => setChanges([]) };
}
