import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import ShareMenu from '../../components/ShareMenu';

export default function RoastHistory({ userId }: { userId: string }) {
  const [tab, setTab] = useState<'all' | 'trophy'>('all');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) loadHistory();
  }, [userId]);

  const loadHistory = async () => {
    try {
      const q = query(
        collection(db, 'roastSessions'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const handleSave = async (id: string, currentlySaved: boolean) => {
    await updateDoc(doc(db, 'roastSessions', id), { saved: !currentlySaved });
    setHistory(history.map(item => item.id === id ? { ...item, saved: !currentlySaved } : item));
  };
  
  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'roastSessions', id));
    setHistory(history.filter(item => item.id !== id));
  };

  const displayedHistory = tab === 'all' ? history : history.filter(item => item.saved);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex gap-4 mb-8">
        <button onClick={() => setTab('all')} className={`px-6 py-2 rounded-full font-bold ${tab === 'all' ? 'bg-white text-black' : 'bg-brutal-black border border-white/20 text-white/70'}`}>All History</button>
        <button onClick={() => setTab('trophy')} className={`px-6 py-2 rounded-full font-bold ${tab === 'trophy' ? 'bg-yellow-500 text-black' : 'bg-brutal-black border border-yellow-500/30 text-yellow-500/70'}`}>Trophy Case 🏆</button>
      </div>

      {loading ? (
        <div className="text-center text-white/50 animate-pulse font-mono py-12">Loading history...</div>
      ) : displayedHistory.length === 0 ? (
        <div className="text-center text-white/50 font-mono py-12">Nothing here yet.</div>
      ) : (
        <div className="space-y-4">
          {displayedHistory.map((item, index) => (
             <div key={`history-${item.id}-${index}`} className={`bg-brutal-black border p-4 rounded-xl ${item.saved ? 'border-yellow-500/50' : 'border-white/10'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs bg-white/10 px-2 py-1 rounded text-white/80 font-mono">{item.persona} • {item.intensity}</span>
                  <span className="text-xs text-white/40">{item.createdAt?.toDate ? new Date(item.createdAt.toDate()).toLocaleDateString() : 'Just now'}</span>
                </div>
                <p className="text-white font-serif italic line-clamp-2 md:line-clamp-none mb-3">"{item.roastText}"</p>
                
                <div className="flex gap-3 justify-end items-center">
                  <ShareMenu 
                    roastId={item.id}
                    roastText={item.roastText}
                    userId={userId}
                    className="scale-90 origin-right"
                  />
                  {!item.saved && tab === 'all' && <button onClick={() => handleSave(item.id, false)} className="text-xs hover:text-yellow-500 text-white/40 transition">💾 Save</button>}
                  <button onClick={() => handleDelete(item.id)} className="text-xs hover:text-red-500 text-white/40 transition">🗑️ Delete</button>
                </div>
             </div>
          ))}
        </div>
      )}
    </div>
  );
}
