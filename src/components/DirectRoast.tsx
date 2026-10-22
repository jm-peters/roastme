// src/components/DirectRoast.tsx - FIXED MOBILE POSITIONING
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, X, Flame, Skull } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DirectRoastProps {
  onClose?: () => void;
  isModal?: boolean;
}

export default function DirectRoast({ onClose, isModal = false }: DirectRoastProps) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleDirectRoast = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username.trim()) {
      setError('Enter a username to roast');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(username.trim().replace('@', ''))}`);
      if (!res.ok) {
        throw new Error('User not found');
      }
      
      const user = await res.json();
      
      localStorage.setItem('roastTarget', user.username);
      localStorage.setItem('roastTargetId', user.id);
      localStorage.setItem('roastTargetName', user.name || user.username);
      
      if (onClose) onClose();
      navigate(`/?roast=${encodeURIComponent(user.username)}`);
    } catch (err) {
      setError('User not found. Make sure they have a roastboard!');
    } finally {
      setLoading(false);
    }
  };

  // If used as modal, return centered content
  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-gray-900 to-black rounded-2xl max-w-md w-full border border-red-500/30 shadow-2xl overflow-hidden"
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-display text-xl uppercase flex items-center gap-2">
                <Target className="text-red-500 w-6 h-6" /> Direct Roast
              </h3>
              {onClose && (
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              )}
            </div>
            
            <p className="text-gray-400 text-xs font-mono uppercase tracking-widest mb-4">
              Enter a username to roast them directly
            </p>
            
            <form onSubmit={handleDirectRoast} className="flex gap-2 mb-4">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-lg">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                  placeholder="username"
                  autoFocus
                  className="w-full bg-gray-800 border-2 border-gray-700 rounded-none pl-10 pr-4 py-3 text-white font-mono text-base focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-display uppercase tracking-widest px-6 py-3 disabled:opacity-50 min-w-[100px] transition-all"
              >
                {loading ? '...' : 'Roast 🔥'}
              </button>
            </form>
            
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/30 p-3 mb-4"
              >
                <p className="text-red-400 text-[10px] font-mono uppercase text-center">{error}</p>
              </motion.div>
            )}
            
            <div className="bg-gray-800/50 p-3">
              <p className="text-gray-500 text-[10px] font-mono uppercase tracking-tighter text-center">
                💡 Users get a roastboard when they create a username<br/>
                🪙 Roast someone and earn coins when they accept!
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Original inline version
  return (
    <div className="bg-gray-800/50 p-4 border border-red-500/30">
      <h3 className="text-white font-display uppercase text-sm mb-2 flex items-center gap-2">
        <Target className="text-red-500 w-4 h-4" /> Direct Roast
      </h3>
      <p className="text-gray-400 text-[10px] font-mono uppercase tracking-widest mb-3">
        Roast someone directly by their username
      </p>
      
      <form onSubmit={handleDirectRoast} className="flex gap-2">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-mono">@</span>
          <input
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError('');
            }}
            placeholder="username"
            className="w-full bg-gray-700 border-2 border-gray-600 rounded-none pl-8 pr-4 py-2 text-white font-mono text-xs focus:outline-none focus:border-red-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 font-display uppercase text-xs transition disabled:opacity-50"
        >
          {loading ? '...' : 'Roast 🔥'}
        </button>
      </form>
      
      {error && (
        <p className="text-red-400 text-[10px] font-mono uppercase mt-2">{error}</p>
      )}
      
      <p className="text-gray-500 text-[9px] font-mono uppercase tracking-widest mt-3">
        💡 Tip: Users get a roastboard when they create a username
      </p>
    </div>
  );
}
