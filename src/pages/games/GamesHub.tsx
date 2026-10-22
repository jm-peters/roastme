import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import Footer from '../../components/Footer';
import { cn } from '../../lib/utils';
import ShareInvite from '../../components/games/ShareInvite';
import DailyTrivia from '../../components/DailyTrivia';

interface Game {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  href: string;
  status: 'active' | 'coming_soon' | 'hot' | 'new';
  players?: number;
}

const games: Game[] = [
  {
    id: 'daily-challenge',
    name: 'Daily Arena Challenge',
    description: '5 Questions. One Shot. Same for everyone globally.',
    icon: '🏆',
    color: 'from-neon-green/80 to-emerald-900',
    href: '/games/daily-challenge',
    status: 'hot',
    players: 1205
  },
  {
    id: 'family-mode',
    name: 'Family Arena',
    description: 'Pass the phone. Shared glory. Mixed difficulty levels.',
    icon: '👨‍👩‍👧‍👦',
    color: 'from-blue-600 to-indigo-800',
    href: '/games/family-mode',
    status: 'new',
    players: 432
  },
  {
    id: 'word-game',
    name: 'Word Puzzle',
    description: 'Unscramble letters to form words. 10 levels!',
    icon: '🔤',
    color: 'from-green-600 to-teal-600',
    href: '/games/word',
    status: 'active',
    players: 234
  },
  {
    id: 'trivia',
    name: 'Quick Fire Trivia',
    description: '10 questions, 10 seconds each. How many can you get right!',
    icon: '⚡',
    color: 'from-yellow-600 to-orange-600',
    href: '/games/trivia',
    status: 'active',
    players: 567
  },
  {
    id: 'memory-match',
    name: 'Memory Match',
    description: 'Match pairs of cards. Test your memory!',
    icon: '🧠',
    color: 'from-blue-600 to-cyan-600',
    href: '/games/memory',
    status: 'active',
    players: 189
  },
  {
    id: 'typing-race',
    name: 'Typing Race',
    description: 'Type fast, earn combos, beat the clock!',
    icon: '⌨️',
    color: 'from-purple-600 to-pink-600',
    href: '/games/typing',
    status: 'active',
    players: 312
  },
  {
    id: 'riddle-me',
    name: 'Riddle Me This',
    description: 'Solve tricky riddles. 10 levels!',
    icon: '❓',
    color: 'from-red-600 to-rose-600',
    href: '/games/riddle',
    status: 'active',
    players: 145
  },
  {
    id: 'bible-trivia',
    name: 'Bible Trivia',
    description: '200+ questions. Test your knowledge of scripture!',
    icon: '📖',
    color: 'from-blue-700 to-indigo-900',
    href: '/arcade/bible',
    status: 'active',
    players: 432
  },
  {
    id: 'educational-trivia',
    name: 'Educational Trivia',
    description: 'Sports, Science, Tech, and more. Master your mind!',
    icon: '🎓',
    color: 'from-amber-600 to-yellow-800',
    href: '/arcade/education',
    status: 'active',
    players: 289
  },
  {
    id: 'quick-battle',
    name: 'Quick Battle ⚔️',
    description: 'Real-time 1v1 multiplayer trivia battles!',
    icon: '⚔️',
    color: 'from-orange-600 to-red-600',
    href: '/games/quick-battle',
    status: 'hot',
    players: 456
  },
  {
    id: 'gauntlet',
    name: 'The Gauntlet 💀',
    description: 'Endless survival mode. How far can you go?',
    icon: '💀',
    color: 'from-purple-900 to-black',
    href: '/games/gauntlet',
    status: 'new',
    players: 120
  },
  {
    id: 'football-trivia',
    name: '⚽ Football Trivia',
    description: 'Test your ball knowledge with 100+ football questions',
    icon: '⚽',
    color: 'from-green-600 to-emerald-600',
    href: '/arcade/football',
    status: 'active',
    players: 342
  },
  {
    id: 'arcade',
    name: 'Arcade Arena',
    description: 'The ultimate collection of trivia and battle modes.',
    icon: '⚡',
    color: 'from-yellow-400 to-amber-600',
    href: '/arcade',
    status: 'new',
    players: 890
  }
];

export default function GamesHub() {
  const [totalPlayers, setTotalPlayers] = useState(0);

  useEffect(() => {
    const activePlayers = games.filter(g => g.status === 'active').reduce((acc, g) => acc + (g.players || 0), 0);
    setTotalPlayers(activePlayers);
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="flex-grow py-12 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-6xl mb-4"
            >
              🎮
            </motion.div>
            <motion.h1 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-display uppercase text-white mb-4"
            >
              OTHER <span className="text-neon-green">GAMES</span>
            </motion.h1>
            <p className="text-gallery-white/40 font-mono text-sm uppercase tracking-widest max-w-lg mx-auto">
              Take a break from roasting. Play, compete, earn coins!
            </p>
            <div className="flex flex-col items-center gap-4 mt-6">
              <div className="inline-block bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5">
                <span className="text-green-400 text-xs font-mono uppercase tracking-widest">
                  🟢 {totalPlayers.toLocaleString()} players online
                </span>
              </div>
              <ShareInvite 
                variant="minimal" 
                url={`/games`} 
                text="Check this out! 🎮" 
              />
            </div>
          </div>

          <div className="mb-8 animate-fade-in">
            <DailyTrivia />
          </div>

          {/* Featured Football Trivia Banner */}
          <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 rounded-2xl p-6 mb-8 border border-green-500/30 text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="text-5xl mb-3 relative z-10 transition-transform group-hover:scale-110 duration-300">⚽</div>
            <h2 className="text-2xl font-bold text-white mb-2 relative z-10">Test Your Football Knowledge!</h2>
            <p className="text-gray-300 mb-4 relative z-10">80+ questions updated for 2020-2026. Learn facts you didn't know!</p>
            <Link to="/arcade/football" className="relative z-10 inline-block">
              <button className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full font-bold transition">
                Play Football Trivia Now →
              </button>
            </Link>
          </div>

          {/* Games Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {games.map((game, index) => (
              <motion.div
                key={game.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 * (index + 2) }}
                className={cn(
                  "bg-gradient-to-br rounded-2xl p-8 border border-white/5 transition-all group relative overflow-hidden",
                  game.color,
                  game.status === 'coming_soon' ? "opacity-50 grayscale" : "hover:scale-[1.02] hover:border-white/20"
                )}
              >
                <div className="flex items-start justify-between relative z-10">
                  <div className="text-6xl group-hover:scale-110 transition-transform">{game.icon}</div>
                  {game.status === 'coming_soon' && (
                    <span className="bg-black/50 backdrop-blur-md text-yellow-400 text-[10px] font-mono uppercase tracking-widest px-3 py-1 rounded-full border border-yellow-400/20">
                      Coming Soon
                    </span>
                  )}
                </div>
                
                <h2 className="text-3xl font-display uppercase text-white mt-6 relative z-10">{game.name}</h2>
                <p className="text-white/70 text-sm mt-2 font-medium relative z-10">{game.description}</p>
                
                {game.status === 'active' && game.players && (
                  <div className="mt-4 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-white/60 relative z-10">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    <span>{game.players.toLocaleString()} playing now</span>
                  </div>
                )}
                
                <div className="mt-8 relative z-10">
                  {game.status !== 'coming_soon' ? (
                    <Link to={game.href}>
                      <button className="w-full bg-white/20 hover:bg-white/30 text-white font-display uppercase text-xs tracking-widest py-3 rounded-xl transition-all border border-white/10">
                        Play Now →
                      </button>
                    </Link>
                  ) : (
                    <button disabled className="w-full bg-white/5 text-white/20 font-display uppercase text-xs tracking-widest py-3 rounded-xl cursor-not-allowed border border-white/5">
                      Coming Soon
                    </button>
                  )}
                </div>

                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/10 transition-colors" />
              </motion.div>
            ))}
          </div>

          {/* Stats Section */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-12 bg-white/5 border border-white/5 rounded-2xl p-8 text-center"
          >
            <p className="text-gallery-white/60 font-mono text-xs uppercase tracking-[0.2em] mb-6">
              🎯 Complete games to earn coins and climb the leaderboard!
            </p>
            <div className="flex flex-wrap justify-center gap-x-12 gap-y-4 text-[10px] font-mono text-gallery-white/20 uppercase tracking-widest">
              <span className="flex items-center gap-2">🏆 Top players get bonuses</span>
              <span className="flex items-center gap-2">⚡ Daily challenges</span>
              <span className="flex items-center gap-2">🪙 Earn coins for high scores</span>
            </div>
          </motion.div>

          {/* Back Button */}
          <div className="text-center mt-12 pb-12">
            <Link to="/" className="text-gallery-white/20 hover:text-neon-green transition-colors font-mono text-xs uppercase tracking-widest">
              ← Back to RoastMe
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

