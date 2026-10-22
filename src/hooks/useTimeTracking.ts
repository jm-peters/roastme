// src/hooks/useTimeTracking.ts
import { useEffect, useRef } from 'react';
import { auth } from '../firebase';

import { fetchWithAuth } from '../utils/apiUtils';

export function useTimeTracking() {
  const startTimeRef = useRef<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTrackedRef = useRef<number>(0);

  useEffect(() => {
    // Start tracking when auth state changes and user is logged in
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && !user.isAnonymous) {
        startTimeRef.current = new Date();
        lastTrackedRef.current = 0;

        if (intervalRef.current) clearInterval(intervalRef.current);
        
        intervalRef.current = setInterval(async () => {
          if (!startTimeRef.current) return;
          
          const now = new Date();
          const secondsElapsed = Math.floor((now.getTime() - startTimeRef.current.getTime()) / 1000);
          const secondsToTrack = secondsElapsed - lastTrackedRef.current;
          
          if (secondsToTrack >= 60) {
            try {
              await fetchWithAuth('/api/user/record-time', {
                method: 'POST',
                body: JSON.stringify({ seconds: 60 })
              });
              lastTrackedRef.current += 60;
            } catch (err) {
              console.error('Time track error:', err);
            }
          }
        }, 60000);
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
        startTimeRef.current = null;
      }
    });

    return () => {
      unsubscribe();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
}
