import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Trophy, Heart, XCircle, CheckCircle2, User, Clock, RefreshCw } from 'lucide-react';
import MarqueeHeader from '../../components/MarqueeHeader';
import Footer from '../../components/Footer';

export default function FriendshipResultsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetch(`/api/friendship/results/${id}`)
        .then(res => {
          if (!res.ok) throw new Error('Results not found');
          return res.json();
        })
        .then(data => {
          setResult(data);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-brutal-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="w-12 h-12 text-neon-green animate-spin mx-auto" />
          <p className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-brutal-black flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="text-8xl">📭</div>
          <h1 className="text-4xl font-display uppercase text-white">No Results Yet</h1>
          <p className="text-gallery-white/40 font-mono text-xs uppercase tracking-widest leading-relaxed">
            Share your challenge link to get responses! Once someone completes it, their score will appear here.
          </p>
          <button 
            onClick={() => navigate('/friendship')} 
            className="w-full bg-neon-green text-brutal-black py-4 font-display uppercase tracking-widest brutal-border hover:bg-white transition-all"
          >
            Create New Challenge →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-brutal-black selection:bg-neon-green selection:text-brutal-black">
      <MarqueeHeader />
      
      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-12">
        <button onClick={() => navigate('/friendship')} className="text-gallery-white/40 hover:text-neon-green transition-colors flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest mb-12">
          <ArrowLeft size={14} /> Back
        </button>

        <AnimatePresence mode="wait">
          <motion.div 
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            <div className="text-center space-y-6">
              <div className={`text-8xl mb-4 ${result.percentage >= 70 ? 'text-green-500' : result.percentage >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                {result.percentage >= 70 ? <Trophy className="mx-auto" size={80} /> : result.percentage >= 40 ? <Heart className="mx-auto" size={80} /> : <XCircle className="mx-auto" size={80} />}
              </div>
              <h2 className="text-6xl font-display uppercase text-white">{result.percentage}% MATCH!</h2>
              <p className="text-gallery-white/60 font-mono text-xs uppercase tracking-widest">
                {result.responderName || 'Someone'} took your challenge!
              </p>
              <div className="inline-block brutal-border bg-gallery-white/5 px-6 py-2">
                <p className="text-white font-mono text-sm uppercase tracking-widest">
                  Score: {result.matchCount} / {result.totalQuestions}
                </p>
              </div>
            </div>

            <div className="brutal-border bg-gallery-white/5 p-8">
              <h3 className="text-white font-display text-xl uppercase mb-8 border-b border-gallery-white/10 pb-4">Answer Comparison</h3>
              <div className="space-y-8">
                {result.comparisons.map((comp: any, idx: number) => (
                  <div key={idx} className="space-y-4 pb-8 border-b border-gallery-white/5 last:border-0 last:pb-0">
                    <p className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest leading-relaxed">{comp.question}</p>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <p className="text-[8px] font-mono text-gallery-white/20 uppercase tracking-widest">You said</p>
                        <div className="brutal-border bg-brutal-black p-3">
                          <p className="text-white font-mono text-xs">{comp.creatorAnswer}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[8px] font-mono text-gallery-white/20 uppercase tracking-widest">{result.responderName || 'Friend'} said</p>
                        <div className={comp.match ? 'brutal-border border-green-500 bg-green-500/10 p-3' : 'brutal-border border-red-500 bg-red-500/10 p-3'}>
                          <p className={`font-mono text-xs ${comp.match ? 'text-green-500' : 'text-red-500'}`}>
                            {comp.friendAnswer || "Not answered"}
                          </p>
                        </div>
                      </div>
                    </div>
                    {comp.match && (
                      <div className="text-green-500 text-[8px] font-mono uppercase tracking-widest flex items-center gap-1">
                        <CheckCircle2 size={10} /> Perfect Match!
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {result.responses && result.responses.length > 1 && (
              <div className="brutal-border bg-gallery-white/5 p-8">
                <h3 className="text-white font-display text-xl uppercase mb-6 border-b border-gallery-white/10 pb-4">Other Responses</h3>
                <div className="space-y-4">
                  {result.responses.slice(0, -1).reverse().map((resp: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-brutal-black border border-gallery-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gallery-white/5 flex items-center justify-center">
                          <User size={14} className="text-gallery-white/40" />
                        </div>
                        <div>
                          <p className="text-white font-mono text-xs uppercase tracking-widest">{resp.responderName}</p>
                          <p className="text-gallery-white/20 font-mono text-[8px] uppercase tracking-widest flex items-center gap-1">
                            <Clock size={8} /> {new Date(resp.completedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className={`font-display text-xl ${resp.percentage >= 70 ? 'text-green-500' : resp.percentage >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {resp.percentage}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-4">
              <button 
                onClick={() => navigate('/friendship')} 
                className="flex-1 bg-pink-500 text-white py-4 font-display uppercase tracking-widest brutal-border hover:bg-white hover:text-brutal-black transition-all"
              >
                Create New Challenge →
              </button>
              <button 
                onClick={() => navigate('/')} 
                className="flex-1 bg-neon-green text-brutal-black py-4 font-display uppercase tracking-widest brutal-border hover:bg-white transition-all"
              >
                Back to Home 🔥
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
