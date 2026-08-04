'use client';
import { useState, useEffect, useCallback } from 'react';

export interface WalletBalance {
  walletBalance: number;
  permanentOdLimit: number;
  currentOdBalance: number;
  tempOdBal: number;
  tempOdValid: boolean;
  tempOdExpiry: string | null;
  odBalance: number;
  creditPool: number;
  displayBalance: number;
}

/* Single shared fetch of /api/wallet/balance — used everywhere a balance figure is shown
 * (CorpHeader, payment-details, insurance/payment, wallet page). `displayBalance` is
 * walletBalance itself: positive (green) means real wallet cash, negative (red) means that much
 * OD/Credit Pool has been drawn. `creditPool` is the total amount still spendable via Credit Pool
 * right now (walletBalance + currentOdBalance + valid tempOdBal). */
export function useWalletBalance(enabled: boolean = true) {
  const [balance, setBalance] = useState<WalletBalance | null>(null);

  const refetch = useCallback(() => {
    if (!enabled) return;
    fetch('/api/wallet/balance')
      .then(res => res.json())
      .then(data => { if (data.walletBalance !== undefined) setBalance(data); })
      .catch(() => {});
  }, [enabled]);

  useEffect(() => { refetch(); }, [refetch]);

  return { balance, refetch };
}
