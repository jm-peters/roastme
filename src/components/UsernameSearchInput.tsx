import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, User, Ghost, ArrowRight, Loader2 } from 'lucide-react';

interface UsernameSearchInputProps {
  onSelect: (username: string) => void;
  placeholder?: string;
  className?: string;
}

export default function UsernameSearchInput({ 
  onSelect, 
  placeholder = "Search username...",
  className = ""
}: UsernameSearchInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const allItems = [...results, ...suggestions];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchUsers = async () => {
      if (query.length < 1) {
        setResults([]);
        setSuggestions([]);
        return;
      }
      
      setLoading(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.users || []);
        setSuggestions(data.suggestions || []);
        setShowResults(true);
        setSelectedIndex(-1);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || allItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % allItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + allItems.length) % allItems.length);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      const selected = allItems[selectedIndex];
      handleSelect(selected.username);
    } else if (e.key === 'Escape') {
      setShowResults(false);
    }
  };

  const handleSelect = (username: string) => {
    onSelect(username);
    setQuery(username);
    setShowResults(false);
    setSelectedIndex(-1);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative group">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gallery-white/20 group-focus-within:text-neon-green transition-colors">
          <Search size={18} />
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 1 && setShowResults(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-gallery-white/5 brutal-border pl-12 pr-12 py-4 font-mono text-sm text-white focus:outline-none focus:ring-2 focus:ring-neon-green transition-all placeholder:text-gallery-white/20"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {loading && <Loader2 size={16} className="text-neon-green animate-spin" />}
          {query && (
            <button 
              onClick={() => { setQuery(''); onSelect(''); }}
              className="text-gallery-white/20 hover:text-white transition-colors"
            >
              <ArrowRight className="rotate-45" size={16} />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showResults && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute z-50 w-full mt-2 bg-brutal-black brutal-border shadow-[8px_8px_0px_0px_rgba(0,255,0,0.2)] max-h-80 overflow-y-auto"
          >
            {results.length === 0 && suggestions.length === 0 && !loading && (
              <div className="p-6 text-center space-y-2">
                <p className="text-gallery-white/40 font-mono text-xs uppercase tracking-widest">No users found matching "{query}"</p>
                <p className="text-gallery-white/20 font-mono text-[10px] uppercase">Try a different name or invite them!</p>
              </div>
            )}

            {/* Direct Matches */}
            {results.map((user: any, idx: number) => (
              <button
                key={user.username}
                onClick={() => handleSelect(user.username)}
                className={`w-full p-4 text-left flex items-center gap-4 border-b border-white/5 last:border-0 transition-colors group ${
                  selectedIndex === idx ? 'bg-neon-green text-brutal-black' : 'hover:bg-neon-green/10'
                }`}
              >
                <div className={`w-10 h-10 brutal-border overflow-hidden flex items-center justify-center ${
                  selectedIndex === idx ? 'bg-brutal-black/20 text-brutal-black' : 
                  user.isAnonymous ? 'bg-purple-600/20 text-purple-400' : 'bg-neon-green/20 text-neon-green'
                }`}>
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    user.isAnonymous ? <Ghost size={20} /> : <User size={20} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-display uppercase italic transition-colors truncate ${
                    selectedIndex === idx ? 'text-brutal-black' : 'text-white group-hover:text-neon-green'
                  }`}>
                    @{user.username}
                  </div>
                  {user.name && (
                    <div className={`font-mono text-[10px] uppercase truncate ${
                      selectedIndex === idx ? 'text-brutal-black/60' : 'text-gallery-white/40'
                    }`}>
                      {user.name}
                    </div>
                  )}
                  <div className={`flex gap-3 font-mono text-[10px] uppercase tracking-widest ${
                    selectedIndex === idx ? 'text-brutal-black/40' : 'text-gallery-white/20'
                  }`}>
                    {!user.isAnonymous && (
                      <>
                        <span className={selectedIndex === idx ? 'text-brutal-black/60' : 'text-yellow-500/60'}>{user.coinBalance} coins</span>
                        <span>{user.totalShares} roasts</span>
                      </>
                    )}
                    {user.isAnonymous && (
                      <span className={selectedIndex === idx ? 'text-brutal-black/60' : 'text-purple-400/60 italic'}>Anonymous Inbox</span>
                    )}
                  </div>
                </div>
                <ArrowRight size={16} className={`transition-colors ${
                  selectedIndex === idx ? 'text-brutal-black' : 'text-gallery-white/20 group-hover:text-neon-green'
                }`} />
              </button>
            ))}

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="bg-gallery-white/5 p-2">
                <p className="px-2 py-1 font-mono text-[8px] uppercase tracking-[0.2em] text-gallery-white/20">Did you mean?</p>
                {suggestions.map((user: any, idx: number) => {
                  const suggestionIdx = results.length + idx;
                  return (
                    <button
                      key={`suggestion-${user.username}`}
                      onClick={() => handleSelect(user.username)}
                      className={`w-full p-3 text-left flex items-center gap-3 rounded transition-colors group ${
                        selectedIndex === suggestionIdx ? 'bg-neon-green text-brutal-black' : 'hover:bg-neon-green/10'
                      }`}
                    >
                      <div className={`w-8 h-8 brutal-border flex items-center justify-center ${
                        selectedIndex === suggestionIdx ? 'bg-brutal-black/20 text-brutal-black' : 'bg-gallery-white/5 text-gallery-white/40'
                      }`}>
                        <User size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-display uppercase italic transition-colors truncate ${
                          selectedIndex === suggestionIdx ? 'text-brutal-black' : 'text-gallery-white/60 group-hover:text-neon-green'
                        }`}>
                          @{user.username}
                        </div>
                        {user.name && (
                          <div className={`font-mono text-[8px] uppercase truncate ${
                            selectedIndex === suggestionIdx ? 'text-brutal-black/60' : 'text-gallery-white/20'
                          }`}>
                            {user.name}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
