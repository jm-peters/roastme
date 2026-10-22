// src/components/FeedItem.tsx - FEED ITEM COMPONENT
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Share2, RefreshCw, Trash2, TrendingUp, Flame, Skull, Heart } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import Markdown from 'react-markdown';
import { FeedItemData } from '../hooks/useFeed';
import { useToast } from './Toast';
import ShareMenu from './ShareMenu';

interface FeedItemProps {
  item: FeedItemData;
  onReact: (roastId: string, type: string) => void;
  onDelete: (roastId: string) => void;
  onRemix: (roastId: string) => void;
  isAuthor: boolean;
}

export default function FeedItem({ item, onReact, onDelete, onRemix, isAuthor }: FeedItemProps) {
  const { showToast } = useToast();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-brutal-black border-2 border-neon-green p-6 relative group"
    >
      {item.isTrending && (
        <div className="absolute -top-3 -right-3 bg-neon-green text-brutal-black px-3 py-1 text-xs font-bold flex items-center gap-1 z-10 shadow-[4px_4px_0px_0px_rgba(0,255,0,0.3)]">
          <TrendingUp className="w-3 h-3" />
          TRENDING
        </div>
      )}

      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-neon-green/10 border border-neon-green flex items-center justify-center font-bold text-neon-green">
            {item.username?.[0]?.toUpperCase() || 'A'}
          </div>
          <div>
            <div className="font-bold text-neon-green">@{item.username || 'anonymous'}</div>
            <div className="text-[10px] text-neon-green/50 uppercase tracking-widest font-mono">
              {new Date(item.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
        {isAuthor && (
          <button
            onClick={() => onDelete(item.id)}
            className="text-red-500 hover:bg-red-500/10 p-2 transition-colors border border-transparent hover:border-red-500/30"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="prose prose-invert max-w-none mb-6">
        <div className="text-lg leading-relaxed text-white font-medium font-display italic">
          <Markdown>{"\"" + item.text + "\""}</Markdown>
        </div>
      </div>

      {item.photoUrl && (
        <div className="mb-6 border-2 border-neon-green/20 overflow-hidden relative group/photo">
          <img
            src={item.photoUrl}
            alt="Roast target"
            className="w-full h-auto object-cover grayscale group-hover/photo:grayscale-0 transition-all duration-700 scale-100 group-hover/photo:scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-neon-green/10 opacity-0 group-hover/photo:opacity-100 transition-opacity pointer-events-none" />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-neon-green/10">
        <div className="flex items-center gap-2">
          <ReactionButton
            icon={<Flame className="w-4 h-4" />}
            count={item.reactions?.fire || 0}
            onClick={() => {
              onReact(item.id, 'fire');
              showToast('Roast lit! 🔥');
            }}
            activeColor="text-orange-500"
          />
          <ReactionButton
            icon={<Skull className="w-4 h-4" />}
            count={item.reactions?.skull || 0}
            onClick={() => {
              onReact(item.id, 'skull');
              showToast('Pure destruction! 💀');
            }}
            activeColor="text-white"
          />
          <ReactionButton
            icon={<Heart className="w-4 h-4" />}
            count={item.reactions?.laugh || 0}
            onClick={() => {
              onReact(item.id, 'laugh');
              showToast('Laughter is the best medicine! 😂');
            }}
            activeColor="text-pink-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onRemix(item.id)}
            className="flex items-center gap-2 px-4 py-2 bg-neon-green/5 hover:bg-neon-green/20 text-neon-green text-xs font-bold border border-neon-green/20 transition-all active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            REMIX ({item.remixCount || 0})
          </button>
          
          <ShareMenu 
            roastId={item.id}
            roastText={item.text}
            photoUrl={item.photoUrl}
            username={item.username}
            userId={item.userId}
          />
        </div>
      </div>


      {/* Featured Gear Section */}
      <div className="mt-4 pt-4 border-t border-neon-green/10">
        <a 
          href="https://amzn.to/48ldi2W" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-between bg-neon-green/5 hover:bg-neon-green/10 p-2 border border-neon-green/10 transition-all group"
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={12} className="text-neon-green" />
            <span className="text-[10px] font-mono text-neon-green/60 uppercase tracking-widest group-hover:text-neon-green transition-colors">
              Featured creator gear
            </span>
          </div>
          <span className="text-[10px] font-mono text-neon-green/40 group-hover:text-neon-green transition-colors">
            Check it out →
          </span>
        </a>
      </div>
    </motion.div>
  );
}

function ReactionButton({ icon, count, onClick, activeColor }: { icon: any, count: number, onClick: () => void, activeColor: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neon-green/5 border border-neon-green/10 hover:border-neon-green/30 transition-all",
        count > 0 ? activeColor : "text-neon-green/40"
      )}
    >
      {icon}
      <span className="text-xs font-bold">{count}</span>
    </button>
  );
}
