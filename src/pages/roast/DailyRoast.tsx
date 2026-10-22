import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import RoastRating from '../../components/roast/RoastRating';
import ShareMenu from '../../components/ShareMenu';

export default function DailyRoast({ userId }: { userId: string }) {
  const [dailyRoast, setDailyRoast] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (userId) loadDailyRoast();
  }, [userId]);

  const loadDailyRoast = async () => {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const docId = `${userId}_${today}`;
    
    try {
      const snap = await getDoc(doc(db, 'dailyRoasts', docId));
      if (snap.exists()) {
        const data = snap.data();
        setDailyRoast({ id: snap.id, ...data });
        setOpened(data.opened || false);
      }
    } catch(e) {}
    setLoading(false);
  };

  const handleOpen = async () => {
    if (!dailyRoast) return;
    setOpened(true);
    await updateDoc(doc(db, 'dailyRoasts', dailyRoast.id), { opened: true });
  };

  const handleRate = async (rating: string) => {
    if (!dailyRoast) return;
    await updateDoc(doc(db, 'dailyRoasts', dailyRoast.id), { rating });
    setDailyRoast((prev: any) => ({ ...prev, rating }));
  };

  if (loading) return <div className="animate-pulse bg-white/5 rounded-2xl h-64 border border-white/10"></div>;

  if (!dailyRoast) return (
    <div className="bg-brutal-black border-2 border-white/10 rounded-2xl p-8 text-center bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
      <h3 className="text-xl font-bold text-white mb-2">Check Back Tomorrow</h3>
      <p className="text-white/50 font-mono text-sm max-w-sm mx-auto">The Daily Roast is generated at midnight. Set up your Roast Profile if you haven't already.</p>
    </div>
  );

  return (
    <div className="bg-brutal-black border-2 border-neon-green/30 rounded-2xl relative overflow-hidden group shadow-[0_0_30px_rgba(0,255,0,0.1)]">
      <div className="absolute top-0 right-0 w-64 h-64 bg-neon-green/10 rounded-full blur-3xl group-hover:bg-neon-green/20 transition-colors pointer-events-none"></div>
      
      {!opened ? (
        <div className="p-12 text-center relative z-10 cursor-pointer" onClick={handleOpen}>
          <div className="text-6xl mb-6 animate-bounce">💌</div>
          <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-4">Your Daily Roast is Ready</h2>
          <button className="bg-neon-green hover:bg-white text-black font-bold uppercase tracking-widest px-8 py-3 rounded-full transition-colors">
            Open the envelope
          </button>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-8 relative z-10">
          <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-2xl font-black text-neon-green italic uppercase tracking-tighter leading-none">Daily Roast</h2>
              <p className="text-white/50 text-xs font-mono mt-1">Written specifically for you.</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-white/40 font-mono text-xs">{new Date(dailyRoast.deliveredAt?.toDate()).toLocaleDateString()}</span>
              <ShareMenu 
                roastId={dailyRoast.id}
                roastText={dailyRoast.roastText}
                userId={userId}
                className="scale-75 origin-right"
              />
            </div>
          </div>
          
          <div className="mb-8">
            {dailyRoast.roastText.split('').map((char: string, i: number) => (
              <motion.span
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.05, delay: i * 0.05 }}
                className="text-white font-serif italic text-2xl leading-relaxed"
              >
                {char}
              </motion.span>
            ))}
          </div>
          
          <div className="bg-black/40 p-4 border border-white/10 rounded-xl">
            <h4 className="text-center text-white/50 text-xs font-mono mb-2 uppercase tracking-widest">Rate today's read</h4>
            <RoastRating onRate={handleRate} initialRating={dailyRoast.rating} />
          </div>
        </motion.div>
      )}
    </div>
  );
}
