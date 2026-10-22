import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Zap, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const StreakFreeze: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleBuy = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/streak/buy-freeze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken()}`
        }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to buy');

      setSuccess(true);
      refreshUser();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const freezes = user?.streakFreezeAvailable || 0;

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-blue-50 relative overflow-hidden" id="streak-freeze-container">
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl" />
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-900">Streak Freeze</h3>
            <p className="text-xs text-gray-500">Protect your hard work</p>
          </div>
        </div>
        <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-black flex items-center gap-1">
           {freezes} ACTIVE
        </div>
      </div>

      <div className="bg-blue-50/50 rounded-2xl p-4 mb-6 border border-blue-100/50">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-blue-500 shrink-0 mt-0.5" size={16} />
          <p className="text-xs text-blue-800 leading-relaxed font-medium">
            Forgot to roast today? We'll automatically use one freeze to keep your streak alive if you miss a day.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={handleBuy}
          disabled={loading}
          className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all active:scale-95 shadow-lg"
          id="buy-freeze-button"
        >
          <Zap size={18} className="text-yellow-400 fill-current" />
          BUY 1 FREEZE (10 COINS)
        </button>
      </div>

      {error && (
        <p className="mt-3 text-center text-xs text-red-500 font-bold">{error}</p>
      )}

      {success && (
        <p className="mt-3 text-center text-xs text-green-600 font-bold flex items-center justify-center gap-1">
          <CheckCircle size={14} /> Purchased successfully!
        </p>
      )}
    </div>
  );
};
