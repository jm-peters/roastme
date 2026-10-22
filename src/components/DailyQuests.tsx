// src/components/DailyQuests.tsx
import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/apiUtils';
import { auth } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function DailyQuests() {
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [quests, setQuests] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(() => {
    return sessionStorage.getItem('dailyQuestsHidden') !== 'true';
  });
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      if (user) loadQuests();
    });
    return () => unsub();
  }, []);

  const loadQuests = async () => {
    try {
      const res = await fetchWithAuth('/api/quests/daily');
      if (res.ok) {
        setQuests(await res.json());
      }
    } catch(e) {}
    setLoading(false);
  };

  const claimBonus = async () => {
    try {
      const res = await fetchWithAuth('/api/quests/claim', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`Claimed ${data.reward} RMP!`);
        loadQuests();
      }
    } catch(e) {}
  };

  const handleQuestClick = (questId: string) => {
    setVisible(false);
    sessionStorage.setItem('dailyQuestsHidden', 'true');
    const routeMap: Record<string, string> = {
      roast: '/',
      battle: '/battle',
      game: '/games',
      friendship: '/friendship',
      anonymous: '/anonymous',
      tod: '/truthordare',
      prank: '/prank',
      feed: '/feed',
    };
    if (routeMap[questId]) {
      navigate(routeMap[questId]);
    }
  };

  if (loading || !currentUser || !quests || !visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-4 border border-purple-500/30 mb-6 shadow-xl relative"
        >
          <button 
            onClick={() => { setVisible(false); sessionStorage.setItem('dailyQuestsHidden', 'true'); }}
            className="absolute top-2 right-2 text-gray-500 hover:text-white"
          >
            ✕
          </button>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold flex items-center gap-2">📋 Daily Quests</h3>
            {quests.allCompleted && !quests.claimedReward && (
              <button onClick={claimBonus} className="bg-yellow-600 text-white font-bold px-4 py-1.5 rounded-full text-xs animate-pulse hover:scale-105 transition">Claim 100 RMP →</button>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quests.quests.map((quest: any) => (
              <div 
                key={quest.id} 
                onClick={() => handleQuestClick(quest.id)}
                className={`bg-gray-800/80 rounded-xl p-3 text-center border relative cursor-pointer hover:bg-gray-700 transition-colors ${quest.completed ? 'border-green-500/50' : 'border-gray-700 hover:border-purple-500/50'}`}
              >
                <div className="text-2xl mb-1">{quest.id === 'roast' ? '🔥' : quest.id === 'battle' ? '⚔️' : quest.id === 'game' ? '🎮' : quest.id === 'friendship' ? '🤝' : quest.id === 'anonymous' ? '👻' : quest.id === 'tod' ? '🎲' : quest.id === 'prank' ? '🎭' : quest.id === 'feed' ? '📰' : '📱'}</div>
                <div className="text-gray-300 text-[10px] uppercase tracking-wider font-bold truncate px-1">{quest.description}</div>
                <div className="text-yellow-400 text-xs font-bold mt-1">+{quest.rewardRMP} RMP</div>
                {quest.completed && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center border-2 border-gray-900 shadow-md">✓</motion.div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
