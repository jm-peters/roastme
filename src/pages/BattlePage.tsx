import BattleMode from '../components/BattleMode';
import MarqueeHeader from '../components/MarqueeHeader';
import { ArrowLeft, Swords } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import RequireUsername from '../components/RequireUsername';

export default function BattlePage() {
  return (
    <div className="min-h-screen flex flex-col items-center selection:bg-neon-green selection:text-brutal-black pb-24">
      <main className="max-w-4xl w-full px-6 py-12 flex flex-col gap-12">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-gallery-white/40 hover:text-neon-green transition-colors flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest">
            <ArrowLeft size={14} /> Back to Roasts
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
            <span className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest">Live Battles</span>
          </div>
        </div>

        <section className="text-center space-y-4">
          <motion.h1 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-6xl md:text-8xl leading-none uppercase font-display"
          >
            BATTLE <span className="text-red-600">ARENA</span>
          </motion.h1>
          <p className="text-gallery-white/60 font-mono text-xs uppercase tracking-[0.3em]">
            Two roasts enter. One roast leaves.
          </p>
        </section>

        <RequireUsername>
          <BattleMode />
        </RequireUsername>
      </main>
    </div>
  );
}
