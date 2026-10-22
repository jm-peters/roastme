import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Swords, 
  Flame, 
  Skull, 
  RefreshCw, 
  TrendingUp, 
  ArrowRight,
  X,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import confetti from 'canvas-confetti';
import { cn } from '../lib/utils';
import { retryWithBackoff, fetchWithAuth } from '../utils/apiUtils';
import { doc, onSnapshot, updateDoc, increment, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface Roast {
  id: string;
  text: string;
  photoUrl?: string;
  createdAt: string;
  userId: string;
  username?: string;
  avatar?: string;
  battleWins: number;
  battleLosses: number;
  user?: {
    username: string;
    avatar?: string;
  };
}

export default function BattleMode() {
  const [roasts, setRoasts] = useState<Roast[]>([]);
  const [loading, setLoading] = useState(true);
  const [votedId, setVotedId] = useState<string | null>(null);
  const [votesCount, setVotesCount] = useState(0);
  const [showAd, setShowAd] = useState(false);

  const [userRMP, setUserRMP] = useState(0);
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    if (userId) {
      const unsubscribe = onSnapshot(doc(db, 'users', userId), (doc) => {
        if (doc.exists()) {
          setUserRMP(doc.data().rmpBalance || 0);
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, `users/${userId}`);
      });
      return () => unsubscribe();
    }
  }, [userId]);

  const fetchBattle = useCallback(async () => {
    setLoading(true);
    setVotedId(null);
    try {
      const res = await retryWithBackoff(() => fetch('/api/battle/roasts'));
      const data = await res.json();
      if (data && Array.isArray(data.roasts)) {
        setRoasts(data.roasts);
      } else {
        setRoasts([]);
      }
    } catch (err) {
      console.error('Failed to fetch battle:', err);
      setRoasts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBattle();
  }, [fetchBattle]);

  const handleVote = async (winnerId: string, loserId: string) => {
    if (votedId) return;
    
    if (userRMP < 100) {
      alert("Insufficient RMP! You need 100 RMP to enter the battle arena. Generate more roasts to earn RMP! 🔥");
      return;
    }

    setVotedId(winnerId);
    setVotesCount(prev => prev + 1);
    
    try {
      if (!userId) return;
      
      // Update Firestore
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        rmpBalance: increment(-100)
      });

      const winnerRef = doc(db, 'roasts', winnerId);
      await updateDoc(winnerRef, {
        battleWins: increment(1)
      });

      const loserRef = doc(db, 'roasts', loserId);
      await updateDoc(loserRef, {
        battleLosses: increment(1)
      });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, 'multiple_paths');
      alert(err.message);
      setVotedId(null);
      return;
    }

    try {
      // Award RMP/Coins to winner's owner (optional, complex to do purely on client safely)
      // For now, we'll still call the API to handle the full reward logic safely
      await retryWithBackoff(() => fetchWithAuth('/api/battle/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winnerId, loserId, userId })
      }));
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF0000', '#FF8C00', '#FFD700']
      });
      
      // Show ad after every 3-5 votes
      if ((votesCount + 1) % 4 === 0) {
        setShowAd(true);
      }
      
      setTimeout(() => {
        if (!showAd) fetchBattle();
      }, 1500);
    } catch (err: any) {
      console.error('API error:', err);
      // We don't necessarily want to reset votedId here if Firestore succeeded
    }
  };

  if (loading && roasts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6">
        <RefreshCw className="animate-spin text-neon-green" size={48} />
        <p className="text-gallery-white/40 font-mono text-xs uppercase tracking-widest">Finding the most savage roasts...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-12 relative">
      <div className="text-center mb-12 space-y-4">
        <div className="inline-flex items-center gap-3 bg-red-600/20 border border-red-500/30 px-4 py-2">
          <Swords className="text-red-500" />
          <h2 className="text-gallery-white font-display text-2xl uppercase tracking-widest">Battle Arena</h2>
        </div>
        <p className="text-gallery-white/40 font-mono text-xs uppercase tracking-widest">Vote for the most savage roast! 🔥</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden md:block">
          <div className="w-16 h-16 bg-brutal-black border-4 border-red-600 flex items-center justify-center rotate-45">
            <span className="text-red-600 font-display text-2xl -rotate-45">VS</span>
          </div>
        </div>

        {Array.isArray(roasts) && roasts.map((roast, idx) => {
          const isWinner = votedId === roast.id;
          const isLoser = votedId && votedId !== roast.id;
          
          return (
            <motion.div 
              key={roast.id}
              initial={{ x: idx === 0 ? -50 : 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className={cn(
                "brutal-border p-8 flex flex-col gap-6 transition-all relative overflow-hidden",
                isWinner ? "border-neon-green bg-neon-green/10 scale-105 z-20" : "bg-gallery-white/5 border-gallery-white/20",
                isLoser ? "opacity-30 grayscale" : "opacity-100"
              )}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gallery-white/10 border border-gallery-white/20 flex items-center justify-center">
                    <Skull className="text-gallery-white/40 w-5 h-5" />
                  </div>
                  <Link to={`/@${roast.user?.username}`} className="text-gallery-white/60 font-mono text-[10px] uppercase tracking-widest hover:text-neon-green">
                    @{roast.user?.username || 'anonymous'}
                  </Link>
                </div>
                <div className="text-[10px] font-mono text-gallery-white/20 uppercase">
                  {roast.battleWins} WINS
                </div>
              </div>

              <div className="font-display text-3xl leading-tight flex-1">
                <Markdown>{roast.text}</Markdown>
              </div>

              {roast.photoUrl && roast.photoUrl.trim() !== "" && (
                <div className="brutal-border overflow-hidden h-48">
                  <img src={roast.photoUrl} alt="Roast context" className="w-full h-full object-cover" />
                </div>
              )}

              <button 
                onClick={() => handleVote(roast.id, roasts[1-idx].id)}
                disabled={!!votedId}
                className={cn(
                  "w-full brutal-btn py-4 flex items-center justify-center gap-3 text-lg transition-all",
                  isWinner ? "bg-neon-green text-brutal-black" : "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                )}
              >
                {isWinner ? (
                  <>SAVAGE! <Award /></>
                ) : (
                  <>VOTE FIRE <Flame /></>
                )}
              </button>

              {isWinner && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 bg-neon-green text-brutal-black px-2 py-1 font-mono text-[10px] font-bold uppercase"
                >
                  Winner!
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-12 flex justify-center">
        <button 
          onClick={fetchBattle}
          className="text-gallery-white/40 hover:text-neon-green transition-colors flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Skip Battle
        </button>
      </div>

      <AnimatePresence>
        {showAd && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-brutal-black/95 flex items-center justify-center p-6 backdrop-blur-md"
          >
            <div className="max-w-xl w-full space-y-8">
              <div className="flex justify-between items-center">
                <h3 className="text-gallery-white font-display text-xl uppercase tracking-widest">Intermission</h3>
                <button 
                  onClick={() => {
                    setShowAd(false);
                    fetchBattle();
                  }}
                  className="text-gallery-white/40 hover:text-white flex items-center gap-2 font-mono text-[10px] uppercase"
                >
                  Skip Ad <X size={16} />
                </button>
              </div>
              <button 
                onClick={() => {
                  setShowAd(false);
                  fetchBattle();
                }}
                className="w-full brutal-btn py-6 text-xl flex items-center justify-center gap-4"
              >
                BACK TO BATTLE <ArrowRight />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
