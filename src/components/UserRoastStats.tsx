import { useState, useEffect } from 'react';
import { fetchWithAuth, retryWithBackoff } from '../utils/apiUtils';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function UserRoastStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        retryWithBackoff(() => fetchWithAuth('/api/user/roast-tier'))
          .then(res => res.json())
          .then(data => {
            setStats(data);
            setLoading(false);
          })
          .catch(e => {
            console.warn('Network offline or backend busy, stats hidden. Error:', e.message);
            setLoading(false);
          });
      } else {
        setStats(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);
  
  if (loading || !stats) return null;
  
  return (
    <div className="bg-gallery-white/5 rounded-xl p-4 mb-4 brutal-border">
      <div className="flex justify-between items-center text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">🔥 Roast Level:</span>
          <span className="text-purple-400 font-bold">{stats.tier?.toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">⚔️ Win Rate:</span>
          <span className="text-green-400">{stats.winRate}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">🎯 Next Tier:</span>
          <div className="w-16 bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div className="bg-yellow-500 h-1.5 rounded-full" style={{ width: `${stats.tierProgress || 0}%` }}></div>
          </div>
        </div>
      </div>
      <p className="text-gray-500 text-xs text-center mt-2 font-mono">
        💡 The more you roast, the better your roasts become!
      </p>
    </div>
  );
}
