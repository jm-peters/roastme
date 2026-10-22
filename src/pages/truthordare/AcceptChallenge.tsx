import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, MessageSquare, RefreshCw, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useToast } from '../../components/Toast';
import MarqueeHeader from '../../components/MarqueeHeader';
import Footer from '../../components/Footer';

interface Challenge {
  id: string;
  challengerName: string;
  mode: string;
  question: string;
  expiresAt: string;
  status: string;
}

export default function AcceptTruthOrDare() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');

  useEffect(() => {
    if (id) {
      fetch(`/api/truthordare/challenge/${id}`)
        .then(res => {
          if (!res.ok) throw new Error('Challenge not found or expired');
          return res.json();
        })
        .then(setChallenge)
        .catch(err => {
          setError(err.message);
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleComplete = async () => {
    if (!response.trim()) {
      showToast('Please provide your response', 'error');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const res = await fetch(`/api/truthordare/complete/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          response,
          userId,
          username: username || 'A Friend'
        })
      });
      
      if (res.ok) {
        setCompleted(true);
        showToast('Challenge completed! 🎲');
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to complete challenge', 'error');
      }
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brutal-black flex items-center justify-center">
        <RefreshCw className="text-neon-green animate-spin" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-brutal-black flex flex-col items-center justify-center p-4">
        <AlertCircle className="text-red-500 mb-4" size={64} />
        <h1 className="text-2xl text-white font-display uppercase italic mb-2">Challenge Not Found</h1>
        <p className="text-gallery-white/40 font-mono text-sm mb-6">{error}</p>
        <button onClick={() => navigate('/')} className="brutal-btn bg-neon-green text-brutal-black px-8">
          Back to Home
        </button>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-brutal-black flex flex-col">
        <MarqueeHeader />
        <main className="flex-1 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-md w-full brutal-border bg-gallery-white/5 p-8 text-center space-y-6"
          >
            <div className="text-6xl">🎉</div>
            <h1 className="text-3xl font-display uppercase italic text-white">Challenge Complete!</h1>
            <p className="text-gallery-white/40 font-mono text-sm uppercase tracking-widest leading-relaxed">
              Your response has been sent to @{challenge?.challengerName}. They've been notified!
            </p>
            
            <div className="bg-neon-green/10 brutal-border p-4 text-left">
              <p className="text-neon-green font-mono text-[10px] uppercase mb-1">Your Response:</p>
              <p className="text-white font-mono text-sm italic">"{response}"</p>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <button onClick={() => navigate('/truthordare')} className="brutal-btn bg-neon-green text-brutal-black">
                Play Again →
              </button>
              <button onClick={() => navigate('/')} className="brutal-btn bg-gallery-white/10 text-white">
                Back to Home
              </button>
            </div>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brutal-black flex flex-col">
      <MarqueeHeader />
      <main className="flex-1 max-w-2xl mx-auto w-full p-4 py-12 space-y-8">
        <div className="text-center space-y-4">
          <div className="text-5xl">🎲</div>
          <h1 className="text-3xl font-display uppercase italic text-white">Challenge Received!</h1>
          <p className="text-gallery-white/40 font-mono text-sm uppercase tracking-widest">
            @{challenge?.challengerName} has challenged you!
          </p>
        </div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`brutal-border p-12 text-center relative overflow-hidden ${
            challenge?.mode === 'truth' ? 'bg-blue-600/10 border-blue-500' : 'bg-red-600/10 border-red-500'
          }`}
        >
          <div className="absolute -top-4 -right-4 opacity-10 rotate-12">
            {challenge?.mode === 'truth' ? <MessageSquare size={120} /> : <Zap size={120} />}
          </div>
          
          <div className="text-6xl mb-6">{challenge?.mode === 'truth' ? '💬' : '⚡'}</div>
          <h2 className={`text-4xl font-display uppercase italic mb-4 ${
            challenge?.mode === 'truth' ? 'text-blue-500' : 'text-red-500'
          }`}>
            {challenge?.mode === 'truth' ? 'TRUTH' : 'DARE'}
          </h2>
          <p className="text-2xl md:text-3xl text-white italic font-mono leading-tight">
            "{challenge?.question}"
          </p>
          <p className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest mt-8">
            {challenge?.mode === 'truth' ? 'Answer honestly. No lying.' : 'Complete the dare. No backing out.'}
          </p>
        </motion.div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest block">Your Response</label>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder={challenge?.mode === 'truth' 
                ? "Type your honest answer here..." 
                : "Describe how you completed the dare..."}
              className="w-full bg-gallery-white/5 brutal-border p-6 text-white font-mono text-sm resize-none h-40 focus:outline-none focus:ring-2 focus:ring-neon-green transition-all"
            />
          </div>

          <button
            onClick={handleComplete}
            disabled={submitting}
            className="w-full brutal-btn bg-neon-green text-brutal-black py-6 text-xl flex items-center justify-center gap-3"
          >
            {submitting ? <RefreshCw className="animate-spin" /> : <>Complete Challenge <ArrowRight /></>}
          </button>
          
          <div className="text-center">
            <p className="text-gallery-white/20 font-mono text-[8px] uppercase tracking-widest">
              Challenge expires on {challenge?.expiresAt ? new Date(challenge.expiresAt).toLocaleDateString() : 'soon'}
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
