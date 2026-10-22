import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, Users, Star, Gift, ChevronRight, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const TIERS = [
  { id: 1, count: 1, rmp: 50, coins: 0, badge: 'Rookie Recruiter', color: 'from-slate-400 to-slate-500' },
  { id: 2, count: 5, rmp: 100, coins: 5, badge: 'Bronze Recruiter', color: 'from-orange-500 to-orange-700' },
  { id: 3, count: 10, rmp: 250, coins: 10, badge: 'Silver Recruiter', color: 'from-gray-300 to-gray-500' },
  { id: 4, count: 25, rmp: 500, coins: 25, badge: 'Gold Recruiter', color: 'from-yellow-400 to-yellow-600' },
  { id: 5, count: 50, rmp: 1000, coins: 50, badge: 'Platinum Recruiter', color: 'from-blue-400 to-indigo-600' },
  { id: 6, count: 100, rmp: 2000, coins: 100, badge: 'Diamond Recruiter', color: 'from-cyan-400 to-blue-600' },
];

export const ReferralLadder: React.FC = () => {
  const { user } = useAuth();
  const [ladder, setLadder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLadder();
  }, []);

  const fetchLadder = async () => {
    try {
      const response = await fetch('/api/referrals/ladder', {
        headers: {
          'Authorization': `Bearer ${await user?.getIdToken()}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setLadder(data.ladder);
      }
    } catch (err) {
      console.error('Failed to fetch ladder:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const currentCount = ladder?.count || 0;
  const currentTier = ladder?.tier || 0;

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-white/50" id="referral-ladder-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="font-black text-2xl text-gray-900 flex items-center gap-2">
            Referral Ladder
            <Gift className="text-pink-500" size={24} />
          </h3>
          <p className="text-sm text-gray-500">More friends, EPIC rewards!</p>
        </div>
        <div className="bg-gray-100 rounded-2xl px-4 py-2 text-center">
          <div className="text-xl font-black text-gray-900">{currentCount}</div>
          <div className="text-[10px] text-gray-500 font-bold uppercase">Friends</div>
        </div>
      </div>

      <div className="space-y-4">
        {TIERS.map((tier, idx) => {
          const isReached = currentCount >= tier.count;
          const isNext = !isReached && (idx === 0 || currentCount >= TIERS[idx-1].count);

          return (
            <motion.div
              key={tier.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: idx * 0.1 }}
              className={`relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                isReached 
                  ? 'border-green-100 bg-green-50/30' 
                  : isNext 
                    ? 'border-yellow-200 bg-yellow-50/20 shadow-lg' 
                    : 'border-gray-100 bg-gray-50/10 opacity-60'
              }`}
            >
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-inner bg-gradient-to-br ${tier.color}`}>
                {isReached ? (
                  <Star className="text-white fill-current" size={28} />
                ) : (
                  <Lock className="text-white/50" size={24} />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className={`font-bold ${isReached ? 'text-gray-900' : 'text-gray-500'}`}>
                    {tier.badge}
                  </h4>
                  <span className="text-xs font-black text-gray-400">
                    {tier.count} {tier.count === 1 ? 'REF' : 'REFS'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                   <div className="flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      <ChevronRight size={12} /> {tier.rmp} RMP
                   </div>
                   {tier.coins > 0 && (
                     <div className="flex items-center gap-1 text-[11px] font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
                        <Gift size={12} /> {tier.coins} COINS
                     </div>
                   )}
                </div>
              </div>

              {isReached && (
                <div className="absolute top-2 right-2">
                  <div className="bg-green-500 text-white p-1 rounded-full">
                    <Star size={10} className="fill-current" />
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-8 p-4 bg-gray-900 rounded-2xl text-white">
        <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">Share Your Link</p>
        <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl border border-white/10">
           <code className="text-sm flex-1 truncate">{`roastme.app/ref/${user?.username}`}</code>
           <button 
             onClick={() => {
               navigator.clipboard.writeText(`https://roastme.app/ref/${user?.username}`);
             }}
             className="bg-white text-gray-900 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-yellow-400 transition-colors"
           >
             COPY
           </button>
        </div>
      </div>
    </div>
  );
};
