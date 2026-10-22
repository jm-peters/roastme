import { useSearchParams } from 'react-router-dom';
import RoastFeed from '../components/RoastFeed';
import MarqueeHeader from '../components/MarqueeHeader';
import { TrendingUp, Clock, Swords, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import Footer from '../components/Footer';

// ... existing imports ...

export default function FeedPage() {
  const [searchParams] = useSearchParams();
  const filter = (searchParams.get('filter') as 'trending' | 'new' | 'savage') || 'new';

  return (
    <div className="flex flex-col items-center selection:bg-neon-green selection:text-brutal-black pb-24">
      <main className="max-w-3xl w-full px-6 py-12 flex flex-col gap-12">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-gallery-white/40 hover:text-neon-green transition-colors flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest">
            <ArrowLeft size={14} /> Back to Roast
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
            <span className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest">Live Feed</span>
          </div>
        </div>

        <section className="text-center space-y-4">
          <motion.h1 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-6xl md:text-8xl leading-none uppercase font-display"
          >
            THE <span className="text-neon-green">PIT</span>
          </motion.h1>
          <div className="flex flex-col gap-2">
            <p className="text-gallery-white/60 font-mono text-xs uppercase tracking-[0.3em]">
              Infinite roasts. Zero mercy.
            </p>
            <div className="flex justify-center gap-4 mt-2">
              <span className="text-[10px] font-mono text-neon-green uppercase animate-pulse">🔥 See what's the number one trending roast</span>
              <span className="text-[10px] font-mono text-red-500 uppercase animate-pulse delay-75">💀 This one got me laughing</span>
              <span className="text-[10px] font-mono text-blue-500 uppercase animate-pulse delay-150">⚡ Pure destruction here</span>
            </div>
          </div>
        </section>

        <RoastFeed filter={filter} />
      </main>
    </div>
  );
}
