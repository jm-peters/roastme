import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Flame, Ghost, Users, Dice5, LayoutGrid, Trophy, Swords, AlertTriangle, User, Settings, Gamepad2, Inbox, Wallet, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import SettingsModal from './SettingsModal';
import TruthOrDareInbox from './TruthOrDareInbox';
import StreakVisual from './StreakVisual';

import { useAppTheme } from '../hooks/useAppTheme';
import { WifiOff } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Roast', icon: <Flame size={18} />, short: '🔥', color: 'text-red-500' },
  { path: '/games/daily-challenge', label: 'Daily', icon: <Trophy size={18} />, short: '🏆', color: 'text-neon-green' },
  { path: '/games', label: 'Games', icon: <Gamepad2 size={18} />, short: '🎮', color: 'text-green-400' },
  { path: '/arcade', label: 'Arcade', icon: <Zap size={18} />, short: '⚡', color: 'text-yellow-400' },
  { path: '/anonymous', label: 'Ghost', icon: <Ghost size={18} />, short: '👻', color: 'text-purple-400' },
  { path: '/friendship', label: 'Friends', icon: <Users size={18} />, short: '🤝', color: 'text-blue-400' },
  { path: '/truthordare', label: 'T/D', icon: <Dice5 size={18} />, short: '🎲', color: 'text-yellow-400' },
  { path: '/prank/create', label: 'Prank', icon: <AlertTriangle size={18} />, short: '🎭', color: 'text-pink-400' },
  { path: '/feed', label: 'Feed', icon: <LayoutGrid size={18} />, short: '📱', color: 'text-cyan-400' },
  { path: '/battle', label: 'Battle', icon: <Swords size={18} />, short: '⚔️', color: 'text-orange-400' },
];

interface NavigationProps {
  username: string;
  avatarUrl: string | null;
  setShowUsernameSetup: (show: boolean) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
}

export default function Navigation({ 
  username, 
  avatarUrl, 
  setShowUsernameSetup,
  onLogout,
  onDeleteAccount
}: NavigationProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const walletPath = `/profile/${username}`;

  const { isOffline } = useAppTheme();

  return (
    <nav className="sticky top-0 z-[100] w-full bg-brutal-black/90 backdrop-blur-md border-b border-white/10">
      {isOffline && (
        <div className="bg-red-600 text-white text-[10px] font-mono tracking-[4px] uppercase py-1 text-center flex items-center justify-center gap-2">
          <WifiOff size={12} /> Offline Mode: Playing Local Content
        </div>
      )}
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="font-display text-2xl uppercase group text-white">
          ROAST<span className="text-neon-green group-hover:text-white transition-colors">ME</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path} 
              className={cn(
                "font-mono text-[10px] uppercase tracking-widest transition-all px-3 py-2 rounded-lg flex items-center gap-2",
                location.pathname === item.path ? item.color : "text-gallery-white/40 hover:text-white hover:bg-white/5"
              )}
            >
              <span className={location.pathname === item.path ? "" : "opacity-50"}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {username ? (
            <div className="flex items-center gap-2">
              <StreakVisual />
              
              <button
                onClick={() => setShowInbox(true)}
                className="p-2 text-gallery-white/40 hover:text-white transition-colors relative"
                aria-label="Inbox"
              >
                <Inbox size={20} />
              </button>
              
              <Link 
                to={walletPath}
                className="p-2 text-gallery-white/40 hover:text-white transition-colors"
                aria-label="Wallet"
              >
                <Wallet size={20} className="text-yellow-400" />
              </Link>
              
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-gallery-white/40 hover:text-white transition-colors"
                aria-label="Settings"
              >
                <Settings size={20} />
              </button>

              <Link 
                to={`/@${username}`} 
                className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-neon-green border border-neon-green/20 px-3 py-1.5 rounded-full hover:bg-neon-green/10 transition-all ml-2"
              >
                <div className="w-6 h-6 rounded-full overflow-hidden bg-brutal-black border border-white/10 flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
                  ) : (
                    <User size={12} />
                  )}
                </div>
                <span className="hidden sm:inline">@{username}</span>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowUsernameSetup(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-5 py-2 font-display uppercase text-[10px] tracking-widest rounded-full hover:opacity-90 transition-all font-black italic shadow-[4px_4px_0px_0px_rgba(57,255,20,0.4)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Nav (Horizontal Scroll) */}
      <div className="lg:hidden flex items-center gap-2 px-6 py-3 border-t border-white/5 overflow-x-auto no-scrollbar scroll-smooth">
        {navItems.map((item) => (
          <Link 
            key={item.path} 
            to={item.path} 
            className={cn(
              "flex-shrink-0 font-mono text-[10px] uppercase tracking-widest transition-all px-4 py-2 rounded-full flex items-center gap-2 bg-white/5",
              location.pathname === item.path ? item.color + " border border-current/20" : "text-gallery-white/40 hover:text-white"
            )}
          >
            {item.short} {item.label}
          </Link>
        ))}
      </div>

      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        username={username}
        onLogout={onLogout}
        onDeleteAccount={onDeleteAccount}
      />
      
      <TruthOrDareInbox 
        isOpen={showInbox} 
        onClose={() => setShowInbox(false)}
        username={username}
      />
    </nav>
  );
}
