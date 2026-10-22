import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Dice5, Send, RefreshCw, ArrowLeft, CheckCircle2, User, MessageSquare, Swords } from 'lucide-react';
import { useToast } from '../../components/Toast';
import MarqueeHeader from '../../components/MarqueeHeader';
import Footer from '../../components/Footer';

export default function InviteBattlePage() {
  const { username, code } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [myName, setMyName] = useState(localStorage.getItem('username') || '');
  const [step, setStep] = useState<'invite' | 'playing' | 'next' | 'completed'>('invite');
  const [currentChallenge, setCurrentChallenge] = useState<{ type: string; text: string } | null>(null);
  const [response, setResponse] = useState('');
  const [conversation, setConversation] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (code) {
      fetch(`/api/truthordare/invite/${code}`)
        .then(res => {
          if (!res.ok) throw new Error('Invite not found or expired');
          return res.json();
        })
        .then(data => {
          setInvite(data);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [code]);

  const generateChallenge = () => {
    const TRUTHS = [
      "What's the biggest lie you've ever told?",
      "What's your most embarrassing moment?",
      "What's something you've never told anyone?",
      "What's your secret talent?",
      "What's the worst text you've accidentally sent?",
      "Who is your secret crush?",
      "What's the most illegal thing you've ever done?",
      "What's your biggest fear?",
      "What's the meanest thing you've ever said to someone?",
      "What's the most expensive thing you've ever stolen?"
    ];
    
    const DARES = [
      "Send a funny voice note to someone",
      "Share your last camera roll photo",
      "Text something embarrassing to a friend",
      "Do 10 jumping jacks right now",
      "Send a compliment to the last person you texted",
      "Post an embarrassing status on social media",
      "Call a random contact and sing Happy Birthday",
      "Eat a spoonful of hot sauce",
      "Let someone else send a text from your phone",
      "Show your browser history"
    ];
    
    const isTruth = Math.random() > 0.5;
    return {
      type: isTruth ? 'truth' : 'dare',
      text: isTruth ? TRUTHS[Math.floor(Math.random() * TRUTHS.length)] : DARES[Math.floor(Math.random() * DARES.length)]
    };
  };

  const acceptInvite = () => {
    if (!myName.trim()) {
      showToast('Please enter your name', 'error');
      return;
    }
    setStep('playing');
    setCurrentChallenge(generateChallenge());
  };

  const submitResponse = async () => {
    if (!response.trim()) {
      showToast('Please provide your response', 'error');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const res = await fetch(`/api/truthordare/invite/${code}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response,
          responderName: myName,
          challengeType: currentChallenge?.type,
          challengeText: currentChallenge?.text
        })
      });
      
      if (!res.ok) throw new Error('Failed to send');

      setConversation(prev => [...prev, {
        type: currentChallenge?.type,
        question: currentChallenge?.text,
        response,
        from: myName
      }]);
      
      setStep('next');
      setResponse('');
      showToast('Response sent! 🚀');
    } catch (err) {
      showToast('Failed to send response', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const continuePlaying = () => {
    setCurrentChallenge(generateChallenge());
    setStep('playing');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brutal-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="w-12 h-12 text-neon-green animate-spin mx-auto" />
          <p className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest">Loading challenge...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-brutal-black flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="text-8xl">🔗</div>
          <h1 className="text-4xl font-display uppercase text-white">Invite Not Found</h1>
          <p className="text-gallery-white/40 font-mono text-xs uppercase tracking-widest leading-relaxed">{error}</p>
          <button 
            onClick={() => navigate('/truthordare')} 
            className="w-full bg-neon-green text-brutal-black py-4 font-display uppercase tracking-widest brutal-border hover:bg-white transition-all"
          >
            Create Your Own Challenge →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-brutal-black selection:bg-neon-green selection:text-brutal-black">
      <MarqueeHeader />
      
      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-12">
        <button onClick={() => navigate('/truthordare')} className="text-gallery-white/40 hover:text-neon-green transition-colors flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest mb-12">
          <ArrowLeft size={14} /> Back
        </button>

        <AnimatePresence mode="wait">
          {step === 'invite' && (
            <motion.div 
              key="invite"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-8"
            >
              <div className="text-8xl">🎲</div>
              <h1 className="text-5xl md:text-7xl font-display uppercase text-white leading-none">
                TRUTH OR <span className="text-neon-green">DARE</span>
              </h1>
              <p className="text-gallery-white/60 font-mono text-xs uppercase tracking-[0.3em]">
                @{invite?.challengerName} has invited you to play!
              </p>
              
              <div className="brutal-border bg-gallery-white/5 p-8 space-y-6">
                <div className="space-y-2 text-left">
                  <label className="text-neon-green font-mono text-[10px] uppercase tracking-widest block">Your Name</label>
                  <input
                    type="text"
                    value={myName}
                    onChange={(e) => setMyName(e.target.value)}
                    placeholder="Enter your name to join"
                    className="w-full bg-brutal-black border border-gallery-white/20 rounded-none px-4 py-4 text-white font-mono text-sm focus:outline-none focus:border-neon-green transition-colors"
                  />
                </div>
                <button 
                  onClick={acceptInvite} 
                  className="w-full bg-neon-green text-brutal-black py-6 font-display uppercase text-xl tracking-widest brutal-border hover:bg-white transition-all"
                >
                  Accept Challenge →
                </button>
              </div>
              
              <p className="text-gallery-white/20 font-mono text-[8px] uppercase tracking-[0.3em]">
                You'll take turns answering Truth or Dare challenges.
              </p>
            </motion.div>
          )}

          {step === 'playing' && currentChallenge && (
            <motion.div 
              key="playing"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="brutal-border bg-gallery-white/5 p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-neon-green" />
                  <span className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest">Opponent: </span>
                  <span className="text-white font-mono text-[10px] uppercase tracking-widest">@{invite?.challengerName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest">You: </span>
                  <span className="text-neon-green font-mono text-[10px] uppercase tracking-widest">{myName}</span>
                </div>
              </div>

              {/* Conversation History */}
              {conversation.length > 0 && (
                <div className="space-y-4 max-h-60 overflow-y-auto p-4 brutal-border bg-gallery-white/5 no-scrollbar">
                  <p className="text-gallery-white/20 font-mono text-[8px] uppercase tracking-widest text-center mb-4">Battle History</p>
                  {conversation.map((msg, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-[8px] uppercase ${msg.from === myName ? 'text-neon-green' : 'text-purple-400'}`}>
                          {msg.from}:
                        </span>
                        <span className="text-gallery-white/40 font-mono text-[8px] uppercase">[{msg.type}]</span>
                      </div>
                      <p className="text-white font-mono text-xs italic">"{msg.question}"</p>
                      <p className="text-gallery-white/60 font-mono text-xs pl-4 border-l border-gallery-white/10">{msg.response}</p>
                    </div>
                  ))}
                </div>
              )}
              
              <div className={`brutal-border p-12 text-center space-y-6 ${
                currentChallenge.type === 'truth' ? 'bg-blue-600/10 border-blue-500' : 'bg-red-600/10 border-red-500'
              }`}>
                <div className="text-6xl">{currentChallenge.type === 'truth' ? '💬' : '⚡'}</div>
                <h2 className={`text-4xl font-display uppercase ${currentChallenge.type === 'truth' ? 'text-blue-500' : 'text-red-500'}`}>
                  {currentChallenge.type === 'truth' ? 'TRUTH' : 'DARE'}
                </h2>
                <p className="text-white text-2xl font-mono italic leading-relaxed">"{currentChallenge.text}"</p>
              </div>
              
              <div className="space-y-4">
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder={currentChallenge.type === 'truth' ? "Type your honest answer..." : "Describe how you completed the dare..."}
                  className="w-full bg-brutal-black border border-gallery-white/20 rounded-none p-6 text-white font-mono text-sm resize-none h-40 focus:outline-none focus:border-neon-green transition-colors"
                />
                
                <button 
                  onClick={submitResponse} 
                  disabled={submitting} 
                  className="w-full bg-neon-green text-brutal-black py-6 font-display uppercase text-xl tracking-widest brutal-border hover:bg-white transition-all disabled:opacity-50"
                >
                  {submitting ? 'Sending...' : 'Submit Response →'}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'next' && (
            <motion.div 
              key="next"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-8"
            >
              <div className="brutal-border bg-green-500/10 border-green-500 p-12 space-y-6">
                <div className="text-8xl">✅</div>
                <h2 className="text-4xl font-display uppercase text-white">Response Sent!</h2>
                <p className="text-gallery-white/60 font-mono text-xs uppercase tracking-widest leading-relaxed">
                  Your response has been delivered to @{invite?.challengerName}.
                </p>
              </div>

              {/* Conversation History */}
              {conversation.length > 0 && (
                <div className="space-y-4 max-h-60 overflow-y-auto p-4 brutal-border bg-gallery-white/5 no-scrollbar text-left">
                  <p className="text-gallery-white/20 font-mono text-[8px] uppercase tracking-widest text-center mb-4">Battle History</p>
                  {conversation.map((msg, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-[8px] uppercase ${msg.from === myName ? 'text-neon-green' : 'text-purple-400'}`}>
                          {msg.from}:
                        </span>
                        <span className="text-gallery-white/40 font-mono text-[8px] uppercase">[{msg.type}]</span>
                      </div>
                      <p className="text-white font-mono text-xs italic">"{msg.question}"</p>
                      <p className="text-gallery-white/60 font-mono text-xs pl-4 border-l border-gallery-white/10">{msg.response}</p>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex flex-col gap-4">
                <button 
                  onClick={continuePlaying} 
                  className="w-full bg-neon-green text-brutal-black py-6 font-display uppercase text-xl tracking-widest brutal-border hover:bg-white transition-all"
                >
                  🎲 Continue Playing
                </button>
                <button 
                  onClick={() => setStep('completed')} 
                  className="w-full bg-gallery-white/5 text-white py-6 font-display uppercase text-xl tracking-widest brutal-border hover:bg-white hover:text-brutal-black transition-all"
                >
                  End Session
                </button>
              </div>
            </motion.div>
          )}

          {step === 'completed' && (
            <motion.div 
              key="completed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center space-y-12"
            >
              <div className="space-y-6">
                <div className="text-8xl">🏆</div>
                <h1 className="text-5xl font-display uppercase text-white">Thanks for Playing!</h1>
                <p className="text-gallery-white/40 font-mono text-xs uppercase tracking-widest leading-relaxed">
                  Your responses have been sent to @{invite?.challengerName}. They can view them in their notifications.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => navigate('/truthordare')} 
                  className="bg-neon-green text-brutal-black py-6 font-display uppercase tracking-widest brutal-border hover:bg-white transition-all flex items-center justify-center gap-3"
                >
                  <Dice5 size={20} /> Create Your Own
                </button>
                <button 
                  onClick={() => navigate('/friendship')} 
                  className="bg-pink-500 text-white py-6 font-display uppercase tracking-widest brutal-border hover:bg-white hover:text-brutal-black transition-all flex items-center justify-center gap-3"
                >
                  <Swords size={20} /> Friend Battle
                </button>
              </div>

              <button 
                onClick={() => navigate('/')} 
                className="text-gallery-white/20 hover:text-white font-mono text-[10px] uppercase tracking-[0.3em] transition-colors"
              >
                Back to RoastMe Home →
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
