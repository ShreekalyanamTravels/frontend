'use client';
import { useEffect, useState } from 'react';

export interface CurrentUser {
  userId: number;
  email: string;
  name: string;
  corporateId: string | null;
  mobile: string | null;
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setUser(data.user))
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
}
