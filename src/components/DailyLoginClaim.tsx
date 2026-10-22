// src/components/DailyLoginClaim.tsx
import { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, X } from 'lucide-react';

export default function DailyLoginClaim() {
  const [canClaim, setCanClaim] = useState(false);
  const [streak, setStreak] = useState(0);
  const [reward, setReward] = useState(0);
  const [loading, setLoading] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => {
      setUser(u);
      if (u && !u.isAnonymous) {
        checkClaimStatus(u);
      }
    });
    return unsub;
  }, []);

  const checkClaimStatus = async (currentUser: any) => {
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch('/api/user/daily-login-status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setCanClaim(data.canClaim);
      setStreak(data.streak);
      setReward(50 + (data.streakBonus || 0));
    } catch (err) {
      console.error('Status check error:', err);
    }
  };

  const handleClaim = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/user/claim-daily-login', { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setClaimed(true);
        setCanClaim(false);
        // Dispatch event for other components to refresh
        window.dispatchEvent(new CustomEvent('economy-update'));
        setTimeout(() => setClaimed(false), 3000);
      } else {
        alert(data.error || 'Claim failed');
      }
    } catch (err) {
      console.error('Claim error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!canClaim && !claimed) return null;

  return (
    <AnimatePresence>
      {(canClaim || claimed) && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-24 right-6 z-50"
        >
          <div className="bg-gradient-to-br from-yellow-600 to-orange-600 rounded-2xl p-4 shadow-2xl border-2 border-white/20">
            {claimed ? (
              <div className="flex items-center gap-3 text-white">
                <Gift className="text-yellow-300 animate-bounce" />
                <p className="font-bold">Claimed {reward} RMP!</p>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Gift className="text-white" size={24} />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Daily Reward Ready!</p>
                  <p className="text-yellow-100 text-xs">+{reward} RMP (Day {streak})</p>
                </div>
                <button 
                  onClick={handleClaim} 
                  disabled={loading}
                  className="bg-white text-orange-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tighter hover:bg-yellow-50 transition-colors shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {loading ? '...' : 'CLAIM'}
                </button>
                <button onClick={() => setCanClaim(false)} className="text-white/40 hover:text-white">
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
