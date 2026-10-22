import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Share2, Copy, Check, MessageSquare, Send, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ShareInviteProps {
  title?: string;
  url: string;
  text: string;
  className?: string;
  variant?: 'minimal' | 'full';
}

export default function ShareInvite({ title = "Invite Friends", url: rawUrl, text: defaultText, className, variant = 'full' }: ShareInviteProps) {
  const [copied, setCopied] = useState(false);
  const [showOptions, setShowOptions] = useState(variant === 'minimal' ? false : true);
  const [captionIndex, setCaptionIndex] = useState(0);

  // Viral caption variations (Total 20 variations for maximum engagement)
  const footballCaptions = [
    // 🔥 Challenge / Competitive
    `⚽ I scored {score} in Football Trivia… can you beat me? 😈`,
    `1400 points 🔥 Football fans, prove you know ball.`,
    `If you score above 1400, you’re officially a football genius 🧠⚽`,
    `I dare you… beat my {score} score 😭🔥`,
    `Football Trivia test: only real fans can pass this 💀⚽`,
    
    // 🧠 Curiosity / Skill
    `Most people fail at question 7… I survived with {score} pts! 😳`,
    `Is it just me or is this Football Quiz actually hard? 💀`,
    `I thought I knew football until I played this. {score} points. 😭`,
    `70% of fans get this wrong. How much do you know? 👇`,
    `Test your football IQ here. My score: {score} 🧠⚽`,

    // 🏆 Bragging Rights
    `Officially the GOAT of Football Trivia with {score} points 🐐⚽`,
    `Ranked #1 today in Football Quiz! Try to beat my {score} score.`,
    `My football knowledge is 10/10. What's yours? 👇`,
    `Unbeatable score of {score}! Who wants to lose to me? 😎`,
    `Don't even try if you're not a real football fan. {score} pts.`,

    // 🎭 Emotional / Funny
    `This game exposed me 😭 {score} points only. Try it.`,
    `One question almost ended my whole football career 💀`,
    `Football Trivia said: "you don't know ball" and I got {score} 💀⚽`,
    `This game will embarrass you in public 😭⚽ try it`,
    `Me vs Football Trivia: It got personal. High score: {score} 🔥`
  ];

  const generalCaptions = [
    `🔥 I hit {score} points in {label}! Can you beat me?`,
    `I'm officially the GOAT at {label} 🐐 score more than {score} if you can.`,
    `This {label} is actually impossible 😭 I only got {score}.`,
    `Challenge: get more than {score} in {label} without cheating 💀`,
    `New high score: {score} in {label} 🔥 your turn.`,
    `I thought I was smart until I played {label} 💀 {score} pts.`,
    `Wait... look at my {label} score {score} 😳`,
    `I dare you to try {label} and beat me 😈`
  ];

  const getDynamicText = () => {
    let displayScore = "1400";
    const scoreMatch = defaultText.match(/(\d+)/);
    if (scoreMatch) displayScore = scoreMatch[1];
    
    const isFootball = defaultText.toLowerCase().includes('football');
    const label = defaultText.split(' in ')[1]?.split('…')[0] || "this game";
    
    const pool = isFootball ? footballCaptions : generalCaptions;
    return pool[captionIndex % pool.length]
      .replace('{score}', displayScore)
      .replace('{label}', label);
  };

  const text = getDynamicText();

  // Ensure production domain for all shared links and handle absolute/relative paths
  const url = rawUrl.startsWith('http') 
    ? rawUrl.replace(/https?:\/\/[^\/]+/, 'https://games.roastme.site')
    : `https://games.roastme.site${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(`${text} ${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'RoastMe Games',
          text: text,
          url: url,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      setShowOptions(true);
    }
  };

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: <MessageSquare size={18} />,
      color: 'bg-[#25D366]',
      href: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`
    },
    {
      name: 'Telegram',
      icon: <Send size={18} />,
      color: 'bg-[#0088cc]',
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
    },
    {
      name: 'Twitter/X',
      icon: <span className="font-bold">𝕏</span>,
      color: 'bg-black',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
    }
  ];

  if (variant === 'minimal') {
    return (
      <div className={cn("relative inline-block", className)}>
        <button 
          onClick={handleNativeShare}
          className="flex items-center gap-2 bg-white/5 border border-white/10 hover:border-white text-white px-4 py-2 text-xs font-mono uppercase tracking-widest transition-all"
        >
          <Share2 size={14} /> Invite
        </button>
      </div>
    );
  }

  return (
    <div className={cn("bg-white/5 border-2 border-white/10 p-6 rounded-none", className)}>
      <h4 className="text-yellow-500 font-mono text-[10px] uppercase tracking-[0.3em] mb-4 text-center">{title}</h4>
      
      <div className="bg-black/40 border border-white/10 p-4 mb-6 rounded-lg group relative">
        <p className="text-white font-bold text-sm leading-relaxed pr-8">
          {text}
        </p>
        <button 
          onClick={() => setCaptionIndex(prev => prev + 1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-neon-green hover:bg-neon-green/10 rounded-full transition-colors"
          title="Shuffle viral caption"
        >
          <RefreshCw size={16} />
        </button>
        <div className="mt-2 text-[10px] font-mono text-white/30 uppercase tracking-widest">
          Viral Caption {captionIndex % (defaultText.toLowerCase().includes('football') ? footballCaptions.length : generalCaptions.length) + 1}/{defaultText.toLowerCase().includes('football') ? footballCaptions.length : generalCaptions.length}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3 mb-6">
        {shareOptions.map(opt => (
          <a
            key={opt.name}
            href={opt.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-white font-black text-xs uppercase tracking-widest transition-transform hover:scale-105 active:scale-95",
              opt.color
            )}
          >
            {opt.icon} {opt.name}
          </a>
        ))}
        
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-3 bg-white text-brutal-black font-black text-xs uppercase tracking-widest transition-transform hover:scale-105 active:scale-95 shadow-[4px_4px_0px_#888]"
        >
          {copied ? <Check size={18} /> : <Copy size={18} />} 
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>

      <div className="bg-brutal-black/50 border border-white/5 p-3 flex items-center gap-3">
        <div className="flex-1 overflow-hidden">
          <p className="text-gallery-white/30 text-[10px] font-mono truncate">{url}</p>
        </div>
        <p className="text-neon-green/40 text-[10px] font-mono whitespace-nowrap uppercase tracking-widest">Share Link</p>
      </div>
    </div>
  );
}
