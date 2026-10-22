import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Dice5, MessageSquare, Zap, Share2, ArrowLeft, RefreshCw, CheckCircle2, Send } from 'lucide-react';
import { useToast } from '../../components/Toast';
import MarqueeHeader from '../../components/MarqueeHeader';
import Footer from '../../components/Footer';

const TRUTHS = [
  "What's the biggest lie you've ever told?",
  "What's your most embarrassing moment?",
  "Who's your secret crush?",
  "What's something you've done that no one knows about?",
  "What's the worst text you've accidentally sent?"
];

const DARES = [
  "Send a random roast to the last person you texted",
  "Post something embarrassing on your social media for 1 hour",
  "Do 20 jumping jacks right now",
  "Send a voice note of you singing to a friend",
  "Let someone send an anonymous message to anyone from your phone"
];

export default function TruthOrDareOpenChallenge() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [step, setStep] = useState<'intro' | 'playing' | 'result'>('intro');
  const [current, setCurrent] = useState<{ type: 'truth' | 'dare'; text: string } | null>(null);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [spinning, setSpinning] = useState(false);

  const userId = localStorage.getItem('userId');
  const myUsername = localStorage.getItem('username');

  const generateChallenge = (type?: 'truth' | 'dare') => {
    const isTruth = type === 'truth' ? true : type === 'dare' ? false : Math.random() > 0.5;
    const item = isTruth ? TRUTHS[Math.floor(Math.random() * TRUTHS.length)] : DARES[Math.floor(Math.random() * DARES.length)];
    return { type: isTruth ? 'truth' as const : 'dare' as const, text: item };
  };

  const startPlaying = () => {
    setSpinning(true);
    setStep('playing');
    
    setTimeout(() => {
      setCurrent(generateChallenge());
      setSpinning(false);
    }, 1500);
  };

  const submitResponse = async () => {
    if (!response.trim()) {
      showToast('Please provide your response', 'error');
      return;
    }

    setLoading(true);
    try {
      // We can notify the creator via an API or just save it
      // For now, let's just show the result
      showToast('Challenge completed! 🎉');
      setStep('result');
    } catch (err) {
      showToast('Failed to submit', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-brutal-black selection:bg-neon-green selection:text-brutal-black">
      <MarqueeHeader />
      
      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-12">
        <div className="flex justify-between items-center mb-12">
          <button onClick={() => navigate('/')} className="text-gallery-white/40 hover:text-neon-green transition-colors flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest">
            <ArrowLeft size={14} /> Back to Roast
          </button>
        </div>

        <section className="text-center mb-12 space-y-4">
          <motion.h1 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-5xl md:text-7xl leading-none uppercase font-display"
          >
            TRUTH OR <span className="text-blue-500">DARE</span>
          </motion.h1>
          <p className="text-gallery-white/60 font-mono text-xs uppercase tracking-[0.3em]">
            @{username} has challenged you!
          </p>
        </section>

        <AnimatePresence mode="wait">
          {step === 'intro' && (
            <motion.div 
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="brutal-border bg-gallery-white/5 p-12 text-center space-y-8"
            >
              <div className="text-7xl animate-bounce">🎲</div>
              <div className="space-y-2">
                <h2 className="text-white text-2xl font-display uppercase">Challenge Accepted?</h2>
                <p className="text-gallery-white/40 font-mono text-xs uppercase tracking-widest leading-relaxed">
                  No backing out once you spin the wheel.
                </p>
              </div>
              <button 
                onClick={startPlaying}
                className="w-full brutal-btn bg-neon-green text-brutal-black py-6 text-xl font-bold uppercase tracking-widest"
              >
                Spin the Wheel 🔥
              </button>
            </motion.div>
          )}

          {step === 'playing' && (
            <motion.div 
              key="playing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-8"
            >
              {spinning ? (
                <div className="py-20">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.5, ease: "linear" }}
                    className="text-8xl mx-auto"
                  >
                    🎲
                  </motion.div>
                  <p className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest mt-8 animate-pulse">
                    Spinning the wheel of fate...
                  </p>
                </div>
              ) : current && (
                <div className="space-y-8">
                  <div className={`brutal-border p-12 text-center relative overflow-hidden ${current.type === 'truth' ? 'bg-blue-600/10 border-blue-500' : 'bg-red-600/10 border-red-500'}`}>
                    <div className="text-6xl mb-6">{current.type === 'truth' ? '💬' : '⚡'}</div>
                    <h2 className={`text-4xl font-display uppercase mb-4 ${current.type === 'truth' ? 'text-blue-500' : 'text-red-500'}`}>
                      {current.type === 'truth' ? 'TRUTH' : 'DARE'}
                    </h2>
                    <p className="text-2xl md:text-3xl text-white italic font-mono leading-tight">
                      "{current.text}"
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <textarea
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      placeholder={current.type === 'truth' ? "Type your honest answer..." : "Describe how you completed the dare..."}
                      className="w-full bg-brutal-black border border-gallery-white/20 p-4 text-white font-mono text-sm resize-none focus:outline-none focus:border-neon-green"
                      rows={4}
                    />
                    <button 
                      onClick={submitResponse} 
                      disabled={loading}
                      className="w-full bg-neon-green text-brutal-black py-4 font-bold uppercase tracking-widest brutal-border hover:bg-white transition-all flex items-center justify-center gap-2"
                    >
                      {loading ? <RefreshCw className="animate-spin" /> : <>I Did It! 🎉</>}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === 'result' && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-8"
            >
              <div className="brutal-border bg-green-500/10 border-green-500 p-12">
                <div className="text-6xl mb-6">🎉</div>
                <h2 className="text-white text-3xl font-display uppercase mb-2">SAVAGE!</h2>
                <p className="text-gallery-white/60 font-mono text-xs uppercase tracking-widest">
                  You survived @{username}'s challenge.
                </p>
              </div>
              
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => {
                    setStep('playing');
                    setResponse('');
                    startPlaying();
                  }} 
                  className="w-full brutal-btn bg-blue-600 text-white py-4 font-bold uppercase tracking-widest brutal-border hover:bg-white hover:text-brutal-black transition-all flex items-center justify-center gap-3"
                >
                  <RefreshCw size={20} /> Play Again
                </button>
                <button onClick={() => navigate('/truthordare')} className="w-full brutal-btn bg-neon-green text-brutal-black py-4 font-bold uppercase tracking-widest brutal-border hover:bg-white transition-all">
                  Create Your Own Challenge →
                </button>
                <button onClick={() => navigate('/')} className="w-full text-gallery-white/20 font-mono text-[10px] uppercase tracking-widest hover:text-white transition-colors">
                  Back to RoastMe
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
