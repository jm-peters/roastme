// src/components/TopRoasterLeaderboard.tsx
import { useState, useEffect } from 'react';
import { doc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface Roaster {
  id: string;
  username: string;
  totalShares: number;
  totalRoasts: number;
  viewCount: number;
  rmpBalance: number;
  avatar: string;
}

export default function TopRoasterLeaderboard() {
  const [roasters, setRoasters] = useState<Roaster[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      orderBy('rmpBalance', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      setRoasters(users);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="fixed md:bottom-4 md:top-auto top-4 right-4 z-40">
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white rounded-full p-3 shadow-lg transition transform hover:scale-105"
      >
        <span className="text-2xl">👑</span>
      </button>

      {/* Leaderboard Modal */}
      {isOpen && (
        <div className="absolute md:bottom-16 md:top-auto top-16 right-0 w-80 bg-gray-900 rounded-2xl shadow-2xl border border-yellow-500/30 overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 p-4 border-b border-yellow-500/30">
            <h3 className="text-white font-bold text-center">👑 TOP ROASTERS 👑</h3>
            <p className="text-yellow-500 text-xs text-center mt-1">Trending instantly • Ego boosted daily</p>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {Array.isArray(roasters) && roasters.length > 0 ? roasters.map((roaster, index) => (
              <div key={roaster.id} className="flex items-center gap-3 p-3 border-b border-gray-800 hover:bg-gray-800/50">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  index === 0 ? 'bg-yellow-600 text-white' :
                  index === 1 ? 'bg-gray-400 text-black' :
                  index === 2 ? 'bg-orange-700 text-white' :
                  'bg-gray-700 text-gray-400'
                }`}>
                  {index + 1}
                </div>
                <img src={roaster.avatar || 'https://picsum.photos/seed/user/100/100'} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">
                    {roaster.username} <span className="text-neon-green text-[10px] font-mono">[{roaster.rmpBalance || 0} RMP]</span>
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-gallery-white/20 text-[10px] font-mono uppercase tracking-widest">
                      Rank #{index + 1}
                    </p>
                    <span className="text-gallery-white/10 text-[10px]">•</span>
                    <p className="text-gallery-white/20 text-[10px] font-mono uppercase tracking-widest">
                      {roaster.viewCount || 1} Views
                    </p>
                  </div>
                </div>
                {index === 0 && <span className="text-yellow-500 text-xl">👑</span>}
              </div>
            )) : (
              <div className="p-8 text-center text-gray-500 text-sm">
                No roasters yet. Be the first!
              </div>
            )}
          </div>
          
          <div className="p-3 text-center border-t border-gray-800">
            <p className="text-gray-500 text-xs">🔥 Be top 3 and get featured globally 🔥</p>
          </div>
        </div>
      )}
    </div>
  );
}
