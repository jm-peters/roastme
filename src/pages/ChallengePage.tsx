import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShieldAlert, Swords, Trophy, Flame, Coins, ArrowRight, Share2, Timer } from 'lucide-react';
import { cn } from '../lib/utils';
import confetti from 'canvas-confetti';

interface Challenge {
  id: string;
  challengerId: string;
  challengedId: string;
  originalRoastId: string;
  status: 'pending' | 'completed' | 'expired';
  coinsAwarded: boolean;
  expiresAt: string;
  createdAt: string;
  challenger: { id: string; username: string; name: string; avatar: string };
  challenged: { id: string; username: string; name: string; avatar: string };
  originalRoast: { id: string; text: string; photoUrl: string };
  responseRoast?: { id: string; text: string; photoUrl: string };
}

export default function ChallengePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isChallengedUser, setIsChallengedUser] = useState(false);

  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        const res = await fetch(`/api/challenges/${id}`);
        if (!res.ok) throw new Error('Challenge not found');
        const data = await res.json();
        setChallenge(data);
        
        const currentUserId = localStorage.getItem('roasterId');
        setIsChallengedUser(data.challengedId === currentUserId);

        // If completed, award coins if not already
        if (data.status === 'completed' && !data.coinsAwarded) {
          fetch('/api/challenges/view', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ challengeId: id, roastId: data.responseRoastId })
          }).then(res => res.json()).then(result => {
            if (result.coinsAwarded) {
              confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#00FF00', '#FFFFFF', '#000000']
              });
            }
          });
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchChallenge();
  }, [id]);

  const handleAccept = () => {
    if (!challenge) return;
    
    // Store challenge context for the upload flow
    localStorage.setItem('roastTarget', challenge.challenger.username);
    localStorage.setItem('roastTargetId', challenge.challengerId);
    localStorage.setItem('challengeId', challenge.id);
    
    navigate('/');
  };

  if (loading) return (
    <div className="min-h-screen bg-brutal-black flex items-center justify-center">
      <div className="animate-spin text-neon-green"><Swords size={48} /></div>
    </div>
  );

  if (error || !challenge) return (
    <div className="min-h-screen bg-brutal-black flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-sm">
        <ShieldAlert size={64} className="text-red-500 mx-auto" />
        <h1 className="text-4xl font-display text-white uppercase italic">Challenge Void</h1>
        <p className="font-mono text-xs text-gallery-white/40 uppercase tracking-widest">{error || 'This challenge does not exist'}</p>
        <button onClick={() => navigate('/')} className="brutal-btn bg-neon-green w-full">Back to Base</button>
      </div>
    </div>
  );

  const isExpired = new Date(challenge.expiresAt) < new Date();
  const timeRemaining = Math.max(0, Math.ceil((new Date(challenge.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60)));

  return (
    <div className="min-h-screen bg-brutal-black selection:bg-neon-green selection:text-brutal-black">
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              {challenge.challenger.avatar && challenge.challenger.avatar.trim() !== "" && (
                <img 
                  src={challenge.challenger.avatar} 
                  className="w-20 h-20 border-4 border-neon-green grayscale"
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="absolute -bottom-2 -right-2 bg-brutal-black border-2 border-neon-green p-1">
                <Swords size={16} className="text-neon-green" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-mono text-neon-green uppercase tracking-widest">Challenger</p>
              <h2 className="text-3xl font-display text-white uppercase italic">@{challenge.challenger.username}</h2>
            </div>
          </div>

          <div className="hidden md:block text-neon-green/20">
            <Swords size={64} />
          </div>

          <div className="flex items-center gap-4 text-right">
            <div className="space-y-1">
              <p className="text-[10px] font-mono text-neon-green uppercase tracking-widest">Challenged</p>
              <h2 className="text-3xl font-display text-white uppercase italic">@{challenge.challenged.username}</h2>
            </div>
            <div className="relative">
              {challenge.challenged.avatar && challenge.challenged.avatar.trim() !== "" && (
                <img 
                  src={challenge.challenged.avatar} 
                  className="w-20 h-20 border-4 border-neon-green grayscale"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
          </div>
        </div>

        {/* Status Banner */}
        <div className={cn(
          "border-4 p-6 text-center space-y-2 relative overflow-hidden",
          challenge.status === 'completed' ? "border-neon-green bg-neon-green/10" : 
          isExpired ? "border-red-600 bg-red-600/10" : "border-gallery-white/20 bg-white/5"
        )}>
          {challenge.status === 'pending' && !isExpired && (
            <>
              <div className="flex items-center justify-center gap-2 text-neon-green mb-2">
                <Timer size={16} />
                <span className="font-mono text-xs uppercase tracking-widest">{timeRemaining} HOURS REMAINING</span>
              </div>
              <h3 className="text-4xl font-display text-white uppercase italic">Challenge Active</h3>
              <p className="font-mono text-xs text-gallery-white/40 uppercase tracking-widest">Accept the challenge to earn 10 coins</p>
            </>
          )}
          {challenge.status === 'completed' && (
            <>
              <Trophy size={48} className="text-neon-green mx-auto mb-4" />
              <h3 className="text-4xl font-display text-neon-green uppercase italic">Challenge Complete</h3>
              <p className="font-mono text-xs text-neon-green/60 uppercase tracking-widest">The roast has been served</p>
            </>
          )}
          {isExpired && challenge.status === 'pending' && (
            <>
              <ShieldAlert size={48} className="text-red-600 mx-auto mb-4" />
              <h3 className="text-4xl font-display text-red-600 uppercase italic">Challenge Expired</h3>
              <p className="font-mono text-xs text-red-600/60 uppercase tracking-widest">The roaster was too slow</p>
            </>
          )}
        </div>

        {/* The Roasts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Original Roast */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Flame size={18} className="text-neon-green" />
              <h4 className="font-mono text-xs uppercase tracking-widest text-gallery-white/40">The Opening Salvo</h4>
            </div>
            <div className="bg-gallery-white/5 border-2 border-gallery-white/10 p-6 space-y-4">
              {challenge.originalRoast.photoUrl && challenge.originalRoast.photoUrl.trim() !== "" && (
                <img src={challenge.originalRoast.photoUrl} className="w-full aspect-video object-cover border border-white/10" referrerPolicy="no-referrer" />
              )}
              <p className="text-xl font-display text-white uppercase italic leading-tight">
                "{challenge.originalRoast.text}"
              </p>
            </div>
          </div>

          {/* Response Roast */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Swords size={18} className="text-neon-green" />
              <h4 className="font-mono text-xs uppercase tracking-widest text-gallery-white/40">The Retaliation</h4>
            </div>
            
            {challenge.status === 'completed' && challenge.responseRoast ? (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-neon-green p-6 border-4 border-brutal-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4"
              >
                {challenge.responseRoast.photoUrl && challenge.responseRoast.photoUrl.trim() !== "" && (
                  <img src={challenge.responseRoast.photoUrl} className="w-full aspect-video object-cover border-2 border-brutal-black" referrerPolicy="no-referrer" />
                )}
                <p className="text-xl font-display text-brutal-black uppercase italic leading-tight">
                  "{challenge.responseRoast.text}"
                </p>
              </motion.div>
            ) : (
              <div className="h-full min-h-[200px] border-2 border-dashed border-gallery-white/10 flex flex-col items-center justify-center p-8 text-center space-y-6">
                {isChallengedUser && !isExpired ? (
                  <>
                    <p className="font-mono text-xs text-gallery-white/40 uppercase tracking-widest">It's your turn to strike back</p>
                    <button 
                      onClick={handleAccept}
                      className="brutal-btn bg-neon-green w-full flex items-center justify-center gap-2"
                    >
                      ACCEPT CHALLENGE <ArrowRight size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="animate-pulse text-gallery-white/10"><Swords size={48} /></div>
                    <p className="font-mono text-xs text-gallery-white/20 uppercase tracking-widest italic">Waiting for response...</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Rewards Info */}
        <div className="bg-brutal-black border-2 border-neon-green p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-neon-green/10 p-3 border border-neon-green">
              <Coins className="text-neon-green" size={24} />
            </div>
            <div>
              <p className="text-xl font-display text-white uppercase italic">10 COINS REWARD</p>
              <p className="font-mono text-[10px] text-gallery-white/40 uppercase">Awarded to both roasters on completion</p>
            </div>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <button 
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                confetti({ particleCount: 50, spread: 30, origin: { y: 0.9 } });
              }}
              className="flex-1 md:flex-none p-3 border-2 border-gallery-white/20 text-gallery-white hover:border-neon-green hover:text-neon-green transition-colors flex items-center justify-center gap-2 font-mono text-xs uppercase"
            >
              <Share2 size={14} /> Share
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
