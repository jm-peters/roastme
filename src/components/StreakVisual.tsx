// src/components/StreakVisual.tsx
import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/apiUtils';
import { auth } from '../firebase';

export default function StreakVisual() {
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      if (user) {
        fetchWithAuth('/api/streak/status')
          .then(res => res.json())
          .then(data => {
             if (data && typeof data.current === 'number') setStreak(data);
          })
          .catch(() => {});
      }
    });
    return () => unsub();
  }, []);

  if (!currentUser || streak.current === 0) return null;

  return (
    <div className="flex items-center gap-3 bg-gradient-to-r from-orange-600/20 to-red-600/20 rounded-full px-4 py-2 border border-orange-500/30 w-fit backdrop-blur-sm shadow-lg">
      <span className="text-2xl drop-shadow-md animate-pulse">🔥</span>
      <div>
        <div className="text-white font-bold text-sm tracking-wide">{streak.current} DAY STREAK</div>
        {streak.longest > streak.current && (
          <div className="text-orange-300/80 text-[10px] uppercase font-bold tracking-wider">Best: {streak.longest}</div>
        )}
      </div>
    </div>
  );
}
