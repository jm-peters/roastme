import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Coins, History, X, TrendingUp, Award } from 'lucide-react';
import { doc, onSnapshot, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export default function CoinsDisplay() {
  const [balance, setBalance] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    if (userId) {
      const unsubscribe = onSnapshot(doc(db, 'users', userId), (doc) => {
        if (doc.exists()) {
          setBalance(doc.data().coinBalance || 0);
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, `users/${userId}`);
      });
      return () => unsubscribe();
    }
  }, [userId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      // For now, we'll still use the API for history as it's easier to manage transactions there
      // or we could fetch from a 'transactions' collection if we implement it.
      const res = await fetch('/api/coins/history', {
        headers: { 'x-user-id': userId || '' }
      });
      const data = await res.json();
      if (data && Array.isArray(data.history)) {
        setHistory(data.history);
      } else {
        setHistory([]);
      }
      setShowHistory(true);
    } catch (err) {
      console.error('Failed to fetch history:', err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  if (!userId) return null;

  return (
    <>
      <button
        onClick={fetchHistory}
        className="flex items-center gap-2 bg-gradient-to-r from-yellow-600 to-amber-600 px-4 py-2 rounded-full hover:from-yellow-500 hover:to-amber-500 transition-all shadow-lg group brutal-border border-yellow-400/50"
      >
        <Coins className="w-5 h-5 text-yellow-300 group-hover:rotate-12 transition-transform" />
        <span className="text-white font-bold font-mono">{balance}</span>
        <span className="text-yellow-200 text-[10px] uppercase font-mono tracking-widest hidden sm:inline">coins</span>
      </button>

      <AnimatePresence>
        {showHistory && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="relative bg-gray-900 rounded-2xl max-w-md w-full border-2 border-yellow-500/30 shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gradient-to-r from-yellow-600/10 to-transparent">
                <h3 className="text-white font-display text-xl uppercase flex items-center gap-3">
                  <Award className="text-yellow-500" /> Coin History
                </h3>
                <button 
                  onClick={() => setShowHistory(false)} 
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              
              <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent animate-spin rounded-full" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-12">
                    <Coins className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-500 font-mono text-sm uppercase">No transactions yet</p>
                    <p className="text-gray-600 text-xs mt-2">Start sharing to earn coins!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Array.isArray(history) && history.map((tx: any) => (
                      <div key={tx.id} className="flex justify-between items-center p-4 bg-white/5 brutal-border border-gray-800 hover:border-yellow-500/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${tx.amount > 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                            <TrendingUp className={`w-4 h-4 ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`} />
                          </div>
                          <div>
                            <p className="text-white text-sm font-mono">{tx.description}</p>
                            <p className="text-gray-500 text-[10px] uppercase font-mono mt-1">
                              {new Date(tx.createdAt).toLocaleDateString()} • {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`font-mono font-bold text-lg ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount}
                          </span>
                          <span className="text-[10px] text-yellow-500 ml-1">🪙</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-gray-800 bg-black/50">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-3 rounded-xl text-center">
                    <p className="text-[10px] font-mono text-gray-500 uppercase mb-1">Current Balance</p>
                    <p className="text-xl font-display text-yellow-500">{balance} 🪙</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl text-center">
                    <p className="text-[10px] font-mono text-gray-500 uppercase mb-1">Total Earned</p>
                    <p className="text-xl font-display text-green-500">{history.reduce((acc, tx) => acc + (tx.amount > 0 ? tx.amount : 0), 0)} 🪙</p>
                  </div>
                </div>
                <p className="text-center text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-6">
                  💡 Share roasts = +1 coin • Refer a friend = +1 coin
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
