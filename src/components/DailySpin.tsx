import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Coins, Zap, Trophy, RefreshCcw, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const REWARDS = [
  { type: 'rmp', amount: 5, color: 'bg-blue-500' },
  { type: 'rmp', amount: 10, color: 'bg-green-500' },
  { type: 'rmp', amount: 25, color: 'bg-purple-500' },
  { type: 'rmp', amount: 50, color: 'bg-pink-500' },
  { type: 'coins', amount: 1, color: 'bg-yellow-500' },
  { type: 'coins', amount: 2, color: 'bg-orange-500' },
  { type: 'coins', amount: 5, color: 'bg-red-500' },
  { type: 'streak_freeze', amount: 1, color: 'bg-cyan-500' },
];

export const DailySpin: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showResult, setShowResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSpunToday, setHasSpunToday] = useState(false);

  useEffect(() => {
    // Check if user has already spun today in the session (optional, server enforces it)
    // For now, we'll just handle the server response
  }, []);

  const handleSpin = async () => {
    if (isSpinning || hasSpunToday) return;

    setIsSpinning(true);
    setError(null);

    try {
      const response = await fetch('/api/spin/daily', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken()}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to spin');
      }

      // Calculate target rotation
      // Find index of reward in our local REWARDS list (approximate for visual)
      let rewardIndex = REWARDS.findIndex(r => r.type === data.reward.type && r.amount === data.reward.amount);
      if (rewardIndex === -1) rewardIndex = 0;

      const segments = REWARDS.length;
      const segmentAngle = 360 / segments;
      const targetRotation = 360 * 5 + (360 - (rewardIndex * segmentAngle));

      setRotation(targetRotation);

      setTimeout(() => {
        setIsSpinning(false);
        setShowResult(data.reward);
        setHasSpunToday(true);
        refreshUser();
      }, 4000);

    } catch (err: any) {
      setError(err.message);
      setIsSpinning(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/50 relative overflow-hidden" id="daily-spin-container">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-100 rounded-xl">
            <RefreshCcw className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-900">Daily Spin</h3>
            <p className="text-xs text-gray-500">Test your luck daily</p>
          </div>
        </div>
        {hasSpunToday && (
          <div className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full animate-pulse">
            COMPLETED
          </div>
        )}
      </div>

      <div className="relative flex justify-center py-8">
        {/* The Wheel */}
        <div className="relative w-64 h-64">
           {/* Pointer */}
           <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
              <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-red-600 shadow-lg" />
           </div>

           <motion.div
             className="w-full h-full rounded-full border-8 border-gray-800 shadow-2xl relative overflow-hidden bg-gray-100"
             animate={{ rotate: rotation }}
             transition={{ duration: 4, ease: [0.15, 0, 0.15, 1] }}
           >
             {REWARDS.map((reward, i) => {
               const angle = 360 / REWARDS.length;
               return (
                 <div
                   key={i}
                   className={`absolute top-0 left-0 w-full h-full ${reward.color} origin-center flex items-center justify-end pr-8`}
                   style={{
                     clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.tan((angle * Math.PI) / 360)}% 0%)`,
                     transform: `rotate(${i * angle}deg)`,
                     borderRight: '1px solid rgba(255,255,255,0.2)'
                   }}
                 >
                    <div className="transform rotate-90 text-white font-bold flex flex-col items-center">
                      {reward.type === 'coins' ? <Coins size={14}/> : reward.type === 'streak_freeze' ? <Zap size={14}/> : <Sparkles size={14}/>}
                      <span className="text-[10px]">{reward.amount}</span>
                    </div>
                 </div>
               );
             })}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-gray-800 rounded-full border-4 border-white shadow-inner flex items-center justify-center z-20">
                <div className="w-2 h-2 bg-white rounded-full" />
             </div>
           </motion.div>
        </div>
      </div>

      <button
        onClick={handleSpin}
        disabled={isSpinning || hasSpunToday}
        id="spin-button"
        className={`w-full py-4 rounded-2xl font-bold text-lg transition-all transform active:scale-95 shadow-lg ${
          hasSpunToday 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:shadow-yellow-200'
        }`}
      >
        {isSpinning ? 'SPINNING...' : hasSpunToday ? 'COME BACK TOMORROW' : 'SPIN NOW!'}
      </button>

      {error && (
        <p className="mt-3 text-center text-xs text-red-500 font-medium">{error}</p>
      )}

      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md"
          >
            <div className="bg-white rounded-3xl p-8 max-w-xs w-full text-center shadow-2xl relative">
              <button 
                onClick={() => setShowResult(null)}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                id="close-reward-modal"
              >
                <X size={20} className="text-gray-400" />
              </button>

              <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                {showResult.type === 'coins' ? (
                  <Coins className="w-12 h-12 text-yellow-600" />
                ) : showResult.type === 'streak_freeze' ? (
                  <Zap className="w-12 h-12 text-blue-600" />
                ) : (
                  <Sparkles className="w-12 h-12 text-purple-600" />
                )}
              </div>

              <h2 className="text-2xl font-black text-gray-900 mb-2">CONGRATS!</h2>
              <p className="text-gray-500 mb-6">
                You won <span className="font-bold text-gray-900">{showResult.amount} {showResult.type.toUpperCase()}</span>
              </p>

              <button
                onClick={() => setShowResult(null)}
                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold shadow-xl active:scale-95 transition-transform"
                id="claim-reward-button"
              >
                AWESOME!
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
