'use client';

import {
  govaDbDeleteGuestSession,
  govaDbGetGuestSession,
  govaDbSetGuestSession,
  type GuestSessionData,
} from '@/lib/gova-db';
import * as React from 'react';

interface UseGuestSessionReturn {
  isGuest: boolean;
  guestId: string | null;
  startGuestSession: () => void;
  endGuestSession: () => void;
}

function generateGuestId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function useGuestSession(): UseGuestSessionReturn {
  const [session, setSession] = React.useState<GuestSessionData | null>(null);

  React.useEffect(() => {
    void (async () => {
      const stored = await govaDbGetGuestSession();
      setSession(stored);
    })();
  }, []);

  const startGuestSession = React.useCallback(async () => {
    const newSession: GuestSessionData = {
      id: generateGuestId(),
      createdAt: new Date().toISOString(),
    };
    await govaDbSetGuestSession(newSession);
    setSession(newSession);
  }, []);

  const endGuestSession = React.useCallback(async () => {
    await govaDbDeleteGuestSession();
    setSession(null);
  }, []);

  return {
    isGuest: !!session,
    guestId: session?.id ?? null,
    startGuestSession: React.useCallback(() => {
      void startGuestSession();
    }, [startGuestSession]),
    endGuestSession: React.useCallback(() => {
      void endGuestSession();
    }, [endGuestSession]),
  };
}
