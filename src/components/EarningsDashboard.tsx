// src/components/EarningsDashboard.tsx
import { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { ECONOMY } from '../utils/economyConstants';
import { TrendingUp, Wallet, Clock, Trophy } from 'lucide-react';
import { motion } from 'motion/react';

export default function EarningsDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [remaining, setRemaining] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const user = auth.currentUser;
    if (!user || user.isAnonymous) return;

    try {
      const token = await user.getIdToken();
      
      const statsRes = await fetch('/api/user/economy', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      setStats(statsData);
      
      const remainingRes = await fetch('/api/user/remaining-earnings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const remainingData = await remainingRes.json();
      setRemaining(remainingData);
    } catch (err) {
      console.error('Fetch dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => {
      if (u && !u.isAnonymous) {
        fetchData();
      } else {
        setLoading(false);
      }
    });

    // Listen for updates from other components
    const handleUpdate = () => fetchData();
    window.addEventListener('economy-update', handleUpdate);
    
    return () => {
      unsub();
      window.removeEventListener('economy-update', handleUpdate);
    };
  }, []);

  if (loading) return <div className="animate-pulse bg-white/5 h-40 rounded-2xl" />;
  if (!stats) return null;

  const progressToWithdrawal = (stats.coinBalance / ECONOMY.MINIMUM_WITHDRAWAL) * 100;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-brutal-black/40 border border-white/10 rounded-2xl overflow-hidden"
    >
      <div className="bg-white/5 p-4 flex justify-between items-center border-b border-white/10">
        <div className="flex items-center gap-2">
          <Wallet size={16} className="text-neon-green" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/60">Earnings Dashboard</span>
        </div>
        <div className="text-[10px] font-mono text-neon-green animate-pulse">LIVE REWARDS ACTIVE</div>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-white/40 text-[10px] font-mono uppercase">Total Balance</p>
            <h3 className="text-3xl font-black text-white">{stats.coinBalance} <span className="text-neon-green text-sm">COINS</span></h3>
          </div>
          <div className="text-right">
            <p className="text-white/40 text-[10px] font-mono uppercase">RMP Value</p>
            <p className="text-xl font-bold text-white/80">{stats.rmpBalance} <span className="text-xs opacity-50">RMP</span></p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-mono text-white/40 mb-1">
            <span>PROGRESS TO $10 PAYOUT</span>
            <span>{progressToWithdrawal.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, progressToWithdrawal)}%` }}
              className="h-full bg-neon-green shadow-[0_0_10px_#00FF00]"
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-white/40">
            <span>{stats.coinBalance} / {ECONOMY.MINIMUM_WITHDRAWAL} COINS</span>
            <span>≈ ${ (stats.coinBalance * 0.001).toFixed(2) } USD</span>
          </div>
        </div>

        {remaining && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
              <TrendingUp size={14} className="mx-auto mb-1 text-red-500" />
              <p className="text-[9px] font-mono text-white/40 uppercase mb-1">Roasts</p>
              <p className="text-sm font-bold text-white">{remaining.roastsRemaining}</p>
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
              <Trophy size={14} className="mx-auto mb-1 text-yellow-500" />
              <p className="text-[9px] font-mono text-white/40 uppercase mb-1">Tasks</p>
              <p className="text-sm font-bold text-white">{remaining.challengesRemaining}</p>
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
              <Clock size={14} className="mx-auto mb-1 text-blue-500" />
              <p className="text-[9px] font-mono text-white/40 uppercase mb-1">Mins</p>
              <p className="text-sm font-bold text-white">{remaining.timeMinutesRemaining}</p>
            </div>
          </div>
        )}


      </div>
    </motion.div>
  );
}
