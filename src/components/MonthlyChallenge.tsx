import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, Calendar, TrendingUp, Award } from 'lucide-react';
import { cn } from '../lib/utils';
import { collection, query, where, limit, onSnapshot, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { retryWithBackoff } from '../utils/apiUtils';

interface Participant {
  userId: string;
  totalRoasts: number;
  totalShares: number;
  totalCoinsEarned: number;
  rmpBalance: number;
  username: string;
  avatar: string;
}

export default function MonthlyChallenge() {
  const [challenge, setChallenge] = useState<any>(null);
  const [topParticipants, setTopParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    retryWithBackoff(() => fetch('/api/platform-data'))
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    // Get active challenge
    const qChallenge = query(
      collection(db, 'challenges'),
      where('isActive', '==', true),
      limit(1)
    );

    const unsubscribeChallenge = onSnapshot(qChallenge, (snapshot) => {
      if (!snapshot.empty) {
        setChallenge({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'challenges');
    });

    // Get top participants from users collection (global for now, or filtered by challenge if we implement it)
    const qParticipants = query(
      collection(db, 'users'),
      orderBy('rmpBalance', 'desc'),
      limit(10)
    );

    const unsubscribeParticipants = onSnapshot(qParticipants, (snapshot) => {
      const participants = snapshot.docs.map(doc => ({
        userId: doc.id,
        ...doc.data()
      })) as any[];
      setTopParticipants(participants);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
      setLoading(false);
    });

    return () => {
      unsubscribeChallenge();
      unsubscribeParticipants();
    };
  }, []);

  if (loading) return <div className="animate-pulse h-48 bg-gallery-white/5 border-2 border-dashed border-gallery-white/10" />;
  
  const currentChallenge = challenge || {
    month: 'JUNE 2026',
    startDate: new Date(2026, 5, 1).toISOString(),
    endDate: new Date(Date.now() + 26 * 24 * 60 * 60 * 1000).toISOString(),
    prizePool: 5000
  };

  const topThree = topParticipants.slice(0, 3);
  const monthName = currentChallenge.startDate 
    ? new Date(currentChallenge.startDate).toLocaleString('default', { month: 'long', year: 'numeric' })
    : 'Current Month';
  const daysRemaining = Math.max(0, Math.ceil((new Date(currentChallenge.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <section className="space-y-6">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-neon-green">
            <Calendar size={16} />
            <span className="font-mono text-xs uppercase tracking-tighter">Current Event</span>
          </div>
          <h2 className="text-3xl font-display uppercase tracking-tighter italic">
            {monthName} <span className="text-neon-green">Roast-Off</span>
          </h2>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-mono uppercase text-gallery-white/40">Time Remaining</p>
          <p className="text-xl font-display text-white">{daysRemaining} DAYS</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top Participant Card */}
        <div className="md:col-span-2 bg-neon-green p-6 border-4 border-brutal-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group">
          <TrendingUp className="absolute -right-4 -bottom-4 w-32 h-32 text-brutal-black/10 group-hover:scale-110 transition-transform" />
          
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2">
              <Trophy size={24} className="text-brutal-black" />
              <span className="font-display text-xl text-brutal-black uppercase">Current Leader</span>
            </div>

            {topThree[0] ? (
              <div className="flex items-center gap-4">
                <img 
                   src={topThree[0].avatar || `https://picsum.photos/seed/${topThree[0].userId}/100/100`} 
                  alt={topThree[0].username}
                  className="w-16 h-16 border-2 border-brutal-black grayscale"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <p className="text-2xl font-display text-brutal-black uppercase">
                    @{topThree[0].username || 'Anonymous'}
                  </p>
                  <div className="flex gap-4 font-mono text-xs text-brutal-black/70 uppercase">
                    <span>{topThree[0].totalRoasts || 0} Roasts</span>
                    <span>{topThree[0].rmpBalance || 0} RMP</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="font-mono text-sm text-brutal-black/60 uppercase italic">No participants yet. Be the first!</p>
            )}
          </div>
        </div>

        {/* Stats Summary */}
        <div className="bg-brutal-black border-4 border-neon-green p-6 shadow-[8px_8px_0px_0px_#00FF00] flex flex-col justify-center gap-4">
          <div>
            <p className="text-[10px] font-mono text-neon-green uppercase">Total Prize Pool</p>
            <p className="text-3xl font-display text-white italic">{(currentChallenge.prizePool || 0).toLocaleString()} COINS</p>
          </div>
          <div className="h-px bg-neon-green/20" />
          <div>
            <p className="text-[10px] font-mono text-neon-green uppercase">Participants</p>
            <p className="text-3xl font-display text-white italic">{(stats?.participants || 1268).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Mini Leaderboard */}
      <div className="bg-gallery-white/5 border-2 border-gallery-white/10 p-4">
        <p className="text-[10px] font-mono uppercase tracking-widest text-gallery-white/40 mb-4">Top Contenders</p>
        <div className="space-y-2">
          {Array.isArray(topParticipants) && topParticipants.slice(1, 6).map((p, i) => (
            <div key={p.userId} className="flex justify-between items-center p-2 hover:bg-white/5 transition-colors group">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-gallery-white/40">0{i + 2}</span>
                <img src={p.avatar || `https://picsum.photos/seed/${p.userId}/100/100`} className="w-6 h-6 border border-white/20 grayscale group-hover:grayscale-0" referrerPolicy="no-referrer" />
                <span className="font-mono text-sm text-white">@{p.username || 'Anonymous'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Award size={12} className="text-neon-green" />
                <span className="font-mono text-xs text-neon-green">{p.rmpBalance || 0}</span>
              </div>
            </div>
          ))}
          {topParticipants.length <= 1 && (
            <p className="text-center py-4 font-mono text-xs text-gallery-white/20 uppercase italic">More roasters needed...</p>
          )}
        </div>
      </div>
    </section>
  );
}
