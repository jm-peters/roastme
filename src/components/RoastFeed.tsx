import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  Clock, 
  Swords, 
  RefreshCw
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useFeed } from '../hooks/useFeed';
import FeedItem from './FeedItem';

interface RoastFeedProps {
  filter?: 'trending' | 'new' | 'savage';
}

export default function RoastFeed({ filter = 'trending' }: RoastFeedProps) {
  const { items, loading, error, reactToRoast, deleteRoast, refresh } = useFeed(filter);
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    refresh();
  }, [filter, refresh]);

  if (loading && items.length === 0) {
    return (
      <div className="flex justify-center py-24">
        <RefreshCw className="animate-spin text-neon-green" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-24 space-y-4">
        <p className="text-red-500 font-mono uppercase">Failed to load the pit: {error}</p>
        <button onClick={refresh} className="brutal-btn px-6 py-2 bg-neon-green text-brutal-black font-bold">Try Again</button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      <div className="flex justify-center gap-4 mb-8">
        {(['trending', 'new', 'savage'] as const).map((f) => (
          <Link
            key={f}
            to={f === 'trending' ? '/feed' : `/feed?filter=${f}`}
            className={cn(
              "px-4 py-2 font-mono text-[10px] uppercase tracking-widest border transition-all",
              filter === f 
                ? "bg-neon-green border-neon-green text-brutal-black" 
                : "bg-transparent border-gallery-white/20 text-gallery-white/60 hover:border-neon-green hover:text-neon-green"
            )}
          >
            {f === 'trending' && <TrendingUp size={12} className="inline mr-2" />}
            {f === 'new' && <Clock size={12} className="inline mr-2" />}
            {f === 'savage' && <Swords size={12} className="inline mr-2" />}
            {f}
          </Link>
        ))}
      </div>

      <div className="space-y-12">
        {items.map((item, index) => (
          <div key={`feed-${item.id}-${index}`}>
            <FeedItem
              item={item}
              onReact={reactToRoast}
              onDelete={deleteRoast}
              onRemix={(id) => window.location.href = `/remix/${id}`}
              isAuthor={item.userId === userId}
            />
          </div>
        ))}
      </div>

      {!loading && items.length === 0 && (
        <div className="text-center py-24">
          <p className="text-gallery-white/20 font-mono text-[10px] uppercase tracking-[0.3em]">The pit is empty. Be the first to roast! 🔥</p>
        </div>
      )}
    </div>
  );
}
