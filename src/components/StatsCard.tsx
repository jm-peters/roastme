import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Award, TrendingUp, Zap, Calendar, Coins } from 'lucide-react';
import { doc, updateDoc, increment, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { retryWithBackoff } from '../utils/apiUtils';

export default function StatsCard() {
  const [stats, setStats] = useState({
    rmpToday: 12400,
    trendingRank: 1,
    avgGeneration: 0.4,
    currentEvent: 'JUNE 2026 ROAST-OFF',
    timeRemaining: 28, // Start at 28 days
    participants: 1268, // Baseline
    roasters: 3214, // Baseline
    prizePool: 5000,
    topLeader: null as any
  });

  const [userRMP, setUserRMP] = useState(0);
  const [userCoins, setUserCoins] = useState(0);
  const username = localStorage.getItem('username');
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    retryWithBackoff(() => fetch('/api/platform-data'))
      .then(res => res.json())
      .then(data => {
        setStats(prev => ({
          ...prev,
          rmpToday: data.rmpToday || prev.rmpToday,
          trendingRank: data.trendingRank || prev.trendingRank,
          avgGeneration: data.avgGeneration || prev.avgGeneration,
          timeRemaining: data.daysRemaining || prev.timeRemaining,
          participants: data.participants || prev.participants,
          roasters: data.roasters || 3214,
          prizePool: data.prizePool || prev.prizePool,
          topLeader: data.topLeader
        }));
      })
      .catch(console.error);

    if (userId) {
      const unsubscribe = onSnapshot(doc(db, 'users', userId), (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setUserRMP(data.rmpBalance || 0);
          setUserCoins(data.coinBalance || 0);
        }
      });
      return () => unsubscribe();
    }
  }, [userId]);

  const handleConvert = async () => {
    if (userRMP < 100) {
      alert("You need at least 100 RMP to convert to coins!");
      return;
    }

    try {
      if (!userId) return;
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        rmpBalance: increment(-100),
        coinBalance: increment(1)
      });
      
      // Also notify legacy backend
      await retryWithBackoff(() => fetch('/api/rmp/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount: 100 })
      }));
    } catch (err) {
      console.error('Conversion error:', err);
    }
  };

  return (
    <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-4 border border-red-500/30 shadow-[4px_4px_0px_0px_rgba(239,68,68,0.3)]">
      {/* Top Row - RMP & Trending */}
      <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-700">
        <div>
          <div className="text-2xl font-display text-white">{stats.rmpToday.toLocaleString()}</div>
          <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">RMP TODAY</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-display text-yellow-400">#{stats.trendingRank}</div>
          <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">TRENDING ON X</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-display text-white">{stats.avgGeneration}s</div>
          <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">AVG GENERATION</div>
        </div>
      </div>

      {/* Current Event */}
      <div className="mb-3 pb-3 border-b border-gray-700">
        <div className="flex justify-between items-center mb-2">
          <div className="text-sm font-bold text-red-400 uppercase tracking-tighter">{stats.currentEvent}</div>
          <div className="text-xs text-gray-400 font-mono uppercase">{stats.timeRemaining} DAYS LEFT</div>
        </div>
        
        <div className="flex justify-between items-center mt-2 text-xs">
          <span className="text-gray-400 font-mono uppercase">🤝 {stats.participants.toLocaleString()} PARTICIPANTS</span>
          <span className="text-yellow-400 font-mono uppercase tracking-tighter">🏆 {stats.prizePool.toLocaleString()} COINS POOL</span>
        </div>
        <div className="flex justify-between items-center mt-1 text-[10px]">
          <span className="text-gray-500 font-mono uppercase">🔥 {stats.roasters.toLocaleString()} ROASTERS</span>
        </div>
      </div>

      {/* Top Leader Display */}
      {stats.topLeader && (
        <div className="mb-3 pb-3 border-b border-gray-700">
          <div className="text-[10px] font-mono text-gray-400 mb-1 uppercase tracking-widest">👑 CURRENT LEADER</div>
          <div className="flex items-center justify-between text-sm">
            <Link to={`/@${stats.topLeader.username}`} className="text-white hover:text-neon-green transition-colors font-display uppercase italic">@{stats.topLeader.username}</Link>
            <div className="text-neon-green text-xs font-mono">{stats.topLeader.rmp.toLocaleString()} RMP</div>
          </div>
        </div>
      )}

      {/* User RMP Display */}
      {username && (
        <>
          <div className="mt-3 pt-3 border-t border-gray-700 flex justify-between items-center">
            <div className="flex flex-col">
              <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">YOUR RMP</div>
              <div className="text-neon-green font-display flex items-center gap-1">
                <Zap size={14} className="text-yellow-400" /> {userRMP} RMP
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">YOUR COINS</div>
              <div className="text-yellow-400 font-display flex items-center gap-1">
                <Coins size={14} /> {userCoins} 🪙
              </div>
            </div>
          </div>
          <div className="mt-2 text-center">
            <button 
              onClick={handleConvert}
              className="text-[10px] font-mono text-gallery-white/40 hover:text-white uppercase tracking-widest underline underline-offset-4"
            >
              Convert 100 RMP to 1 Coin
            </button>
          </div>
        </>
      )}
    </div>
  );
}
