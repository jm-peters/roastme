// src/pages/RoastboardPage.tsx
import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Flame, Share2, TrendingUp, ArrowLeft, Trophy, Skull } from 'lucide-react';
import Markdown from 'react-markdown';
import CoinsDisplay from '../components/CoinsDisplay';
import DirectRoast from '../components/DirectRoast';
import Footer from '../components/Footer';

interface RoastboardUser {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  avatarUrl?: string | null;
  roastboardSlug: string;
  totalShares: number;
  totalReferrals: number;
  viewCount: number;
  createdAt: string;
  roasts: Array<{
    id: string;
    text: string;
    photoUrl: string;
    shareCount: number;
    createdAt: string;
  }>;
}

export default function RoastboardPage() {
  const { username } = useParams();
  const [user, setUser] = useState<RoastboardUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (username) {
      const fetchUser = async () => {
        try {
          const res = await fetch(`/api/users/${username}`, {
            headers: {
              'x-user-id': localStorage.getItem('userId') || ''
            }
          });
          if (!res.ok) throw new Error('User not found');
          const data = await res.json();
          setUser(data);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchUser();
    }
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-brutal-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-neon-green border-t-transparent animate-spin rounded-full" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-brutal-black flex flex-col items-center justify-center p-6 text-center">
        <Skull className="w-20 h-20 text-red-500 mb-6" />
        <h1 className="text-4xl font-display uppercase text-white mb-4">ROASTBOARD NOT FOUND</h1>
        <p className="text-gallery-white/60 font-mono mb-8">This roaster doesn't exist or hasn't claimed their roastboard yet.</p>
        <Link to="/" className="brutal-btn flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> BACK TO SAFETY
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brutal-black text-gallery-white font-sans selection:bg-neon-green selection:text-brutal-black">
      {/* Navigation */}
      <nav className="p-6 flex justify-between items-center border-b-2 border-gallery-white/10">
        <Link to="/" className="text-2xl font-display uppercase group flex items-center gap-2">
          ROAST<span className="text-neon-green group-hover:text-white transition-colors">ME</span>
        </Link>
        <div className="flex items-center gap-4">
          <CoinsDisplay />
          <DirectRoast />
          <Link to="/" className="brutal-btn py-2 px-4 text-xs flex items-center gap-2">
            <Flame className="w-4 h-4" /> ROAST SOMEONE
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6 pt-12">
        {/* Profile Header */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-gallery-white/5 brutal-border p-8 mb-12 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-neon-green/5 blur-3xl -mr-32 -mt-32" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="relative">
              <div className="w-32 h-32 brutal-border overflow-hidden bg-brutal-black p-1">
                <img
                  src={user.avatarUrl || user.image || `https://picsum.photos/seed/${user.id}/200/200`}
                  alt={user.username}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-neon-green text-brutal-black rounded-full p-2 brutal-border border-2">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            
            <div className="text-center md:text-left flex-1">
              <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
                <h1 className="text-4xl font-display uppercase tracking-tight">
                  @{user.username} <span className="text-neon-green text-xl font-mono">[{user.totalShares}RMP]</span>
                </h1>
                {user.totalShares > 100 && <Trophy className="w-6 h-6 text-yellow-500" />}
              </div>
              <p className="text-gallery-white/40 font-mono text-xs uppercase tracking-widest">
                Member since {new Date(user.createdAt || Date.now()).toLocaleDateString()}
              </p>
              
              <div className="flex flex-wrap gap-8 mt-8 justify-center md:justify-start">
                <div className="text-center">
                  <div className="text-2xl font-display text-neon-green">{user.roasts.length}</div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-gallery-white/40">Roasts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-display text-blue-500">{user.totalShares}</div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-gallery-white/40">RMP</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-display text-orange-500">{user.totalReferrals || 0}</div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-gallery-white/40">Referrals</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-display text-purple-500">{user.viewCount || 0}</div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-gallery-white/40">Views</div>
                </div>
              </div>
            </div>
            
            <Link
              to="/"
              className="brutal-btn bg-neon-green text-brutal-black py-4 px-8 text-lg flex items-center gap-2"
            >
              ROAST THEM 🔥
            </Link>
          </div>
        </motion.div>

        {/* Roast Collection */}
        <h2 className="text-2xl font-display uppercase mb-8 flex items-center gap-3">
          <Flame className="w-6 h-6 text-neon-green" /> 
          Roast Collection
          <span className="text-gallery-white/20 font-mono text-sm font-normal">({user.roasts.length})</span>
        </h2>
        
        {user.roasts.length === 0 ? (
          <div className="bg-gallery-white/5 brutal-border p-16 text-center">
            <div className="text-6xl mb-6 opacity-20">😴</div>
            <p className="text-gallery-white/40 font-mono uppercase tracking-widest">No roasts yet. Be the first to roast them!</p>
            <Link to="/" className="inline-block mt-8 text-neon-green hover:underline font-mono uppercase text-sm">
              Start Roasting →
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {Array.isArray(user.roasts) && user.roasts.map((roast, index) => (
              <motion.div
                key={roast.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={`/roast/${roast.id}`}
                  className="bg-gallery-white/5 hover:bg-gallery-white/10 brutal-border p-6 transition-all flex items-start gap-6 group"
                >
                  {roast.photoUrl && roast.photoUrl.trim() !== "" && (
                    <div className="w-20 h-20 brutal-border overflow-hidden bg-brutal-black flex-shrink-0">
                      <img
                        src={roast.photoUrl}
                        alt="Roast victim"
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-lg md:text-xl font-mono italic text-gallery-white/80 line-clamp-2 mb-4">
                      "{roast.text}"
                    </div>
                    <div className="flex items-center gap-6 text-[10px] font-mono uppercase tracking-widest text-gallery-white/40">
                      <span className="flex items-center gap-1"><Share2 className="w-3 h-3" /> {roast.shareCount} shares</span>
                      <span>📅 {new Date(roast.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-neon-green self-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowLeft className="w-6 h-6 rotate-180" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
