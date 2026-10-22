import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, MessageSquare, RefreshCw, AlertCircle, CheckCircle2, ArrowRight, Send } from 'lucide-react';
import { useToast } from '../../components/Toast';
import MarqueeHeader from '../../components/MarqueeHeader';
import Footer from '../../components/Footer';

interface InviteData {
  id: string;
  challengerName: string;
  status: string;
  createdAt: string;
}

export default function TruthOrDareInvite() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'invite' | 'playing' | 'responding'>('invite');
  const [currentChallenge, setCurrentChallenge] = useState<{ type: string; text: string } | null>(null);
  const [response, setResponse] = useState('');
  const [conversation, setConversation] = useState<{ type: string; content: string; from: string; challengeText?: string }[]>([]);
  const [myName, setMyName] = useState(localStorage.getItem('username') || '');

  useEffect(() => {
    if (code) {
      // Fetch invite details once
      fetch(`/api/truthordare/invite/${code}`)
        .then(res => {
          if (!res.ok) throw new Error('Invite not found');
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

      const fetchResponses = () => {
        fetch(`/api/truthordare/invite/${code}/responses`)
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) {
              setConversation(data.map((r: any) => ({
                type: r.challengeType,
                content: r.response,
                from: r.responderName,
                challengeText: r.challengeText
              })));
            }
          })
          .catch(console.error);
      };

      fetchResponses();
      const interval = setInterval(fetchResponses, 5000);
      return () => clearInterval(interval);
    }
  }, [code]);

  const acceptInvite = () => {
    if (!myName.trim()) {
      showToast('Please enter your name', 'error');
      return;
    }
    setStep('playing');
    generateChallenge();
  };

  const generateChallenge = () => {
    const TRUTHS = [
      "What's the biggest lie you've ever told?",
      "What's your most embarrassing moment?",
      "What's something you've never told anyone?",
      "What's your secret talent?",
      "Who is your secret crush?",
      "What's the most illegal thing you've ever done?",
      "What's your biggest insecurity?"
    ];
    
    const DARES = [
      "Send a funny voice note to your ex",
      "Share your last camera roll photo",
      "Text something embarrassing to a random contact",
      "Do 10 jumping jacks right now and record it",
      "Post a cringy selfie on your story",
      "Call a friend and try to sell them a used sock",
      "Eat a spoonful of hot sauce"
    ];
    
    const isTruth = Math.random() > 0.5;
    const challenge = {
      type: isTruth ? 'truth' : 'dare',
      text: isTruth ? TRUTHS[Math.floor(Math.random() * TRUTHS.length)] : DARES[Math.floor(Math.random() * DARES.length)]
    };
    
    setCurrentChallenge(challenge);
  };

  const submitResponse = async () => {
    if (!response.trim()) {
      showToast('Please provide your response', 'error');
      return;
    }
    
    try {
      // Send to challenger
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
      
      if (!res.ok) throw new Error('Failed to send response');

      // Add to conversation
      setConversation(prev => [...prev, {
        type: currentChallenge?.type || 'response',
        content: response,
        from: myName
      }]);
      
      setStep('responding');
      setResponse('');
      
      // Generate next challenge or end
      setTimeout(() => {
        generateChallenge();
        setStep('playing');
      }, 3000);
    } catch (err) {
      showToast('Failed to submit response', 'error');
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
        <h1 className="text-2xl text-white font-display uppercase italic mb-2">Invite Not Found</h1>
        <p className="text-gallery-white/40 font-mono text-sm mb-6">{error}</p>
        <button onClick={() => navigate('/truthordare')} className="brutal-btn bg-neon-green text-brutal-black px-8">
          Create Your Own Challenge →
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brutal-black flex flex-col">
      <MarqueeHeader />
      <main className="flex-1 max-w-2xl mx-auto w-full p-4 py-12 space-y-8">
        <AnimatePresence mode="wait">
          {step === 'invite' && (
            <motion.div 
              key="invite"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-8"
            >
              <div className="text-7xl animate-bounce">🎲</div>
              <div className="space-y-4">
                <h1 className="text-4xl font-display uppercase italic text-white leading-none">Truth or Dare Challenge</h1>
                <p className="text-gallery-white/40 font-mono text-sm uppercase tracking-widest">
                  @{invite?.challengerName} has invited you to play!
                </p>
              </div>
              
              <div className="brutal-border bg-gallery-white/5 p-8 space-y-6">
                <div className="space-y-2 text-left">
                  <label className="text-neon-green font-mono text-[10px] uppercase tracking-widest block">Enter your name to join</label>
                  <input
                    type="text"
                    value={myName}
                    onChange={(e) => setMyName(e.target.value)}
                    placeholder="Your name"
                    className="w-full bg-brutal-black border border-gallery-white/20 px-4 py-4 text-gallery-white font-mono text-sm focus:outline-none focus:border-neon-green"
                  />
                </div>
                <button 
                  onClick={acceptInvite} 
                  className="w-full brutal-btn bg-neon-green text-brutal-black py-5 text-xl font-bold uppercase tracking-widest"
                >
                  Accept Challenge →
                </button>
              </div>
              
              <p className="text-gallery-white/20 font-mono text-[8px] uppercase tracking-[0.3em] max-w-xs mx-auto">
                You'll take turns sending Truth or Dare challenges to each other. No backing out.
              </p>
            </motion.div>
          )}

          {step === 'playing' && currentChallenge && (
            <motion.div 
              key="playing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8"
            >
              <div className="brutal-border bg-gallery-white/5 p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
                  <span className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest">Playing with @{invite?.challengerName}</span>
                </div>
                <span className="text-neon-green font-mono text-[10px] uppercase tracking-widest">You: {myName}</span>
              </div>

              {/* Conversation History */}
              {conversation.length > 0 && (
                <div className="space-y-4 max-h-60 overflow-y-auto p-4 brutal-border bg-gallery-white/5">
                  <p className="text-gallery-white/20 font-mono text-[8px] uppercase tracking-widest mb-2">Battle History</p>
                  {conversation.map((msg, idx) => (
                    <div key={idx} className={`p-3 brutal-border ${msg.from === myName ? 'bg-neon-green/10 border-neon-green ml-8' : 'bg-blue-500/10 border-blue-500 mr-8'}`}>
                      <p className="text-[8px] font-mono uppercase opacity-40 mb-1">{msg.from}</p>
                      <p className="text-[10px] font-mono text-gallery-white/60 italic mb-1">Q: {msg.challengeText}</p>
                      <p className="text-xs font-mono text-white">{msg.content}</p>
                    </div>
                  ))}
                </div>
              )}
              
              <div className={`brutal-border p-12 text-center relative overflow-hidden ${
                currentChallenge.type === 'truth' ? 'bg-blue-600/10 border-blue-500' : 'bg-red-600/10 border-red-500'
              }`}>
                <div className="text-6xl mb-6">{currentChallenge.type === 'truth' ? '💬' : '⚡'}</div>
                <h2 className={`text-4xl font-display uppercase italic mb-4 ${
                  currentChallenge.type === 'truth' ? 'text-blue-500' : 'text-red-500'
                }`}>
                  {currentChallenge.type === 'truth' ? 'TRUTH' : 'DARE'}
                </h2>
                <p className="text-2xl md:text-3xl text-white italic font-mono leading-tight">
                  "{currentChallenge.text}"
                </p>
              </div>
              
              <div className="space-y-4">
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder={currentChallenge.type === 'truth' ? "Type your honest answer..." : "Describe how you completed the dare..."}
                  className="w-full bg-gallery-white/5 brutal-border p-6 text-white font-mono text-sm resize-none h-40 focus:outline-none focus:ring-2 focus:ring-neon-green transition-all"
                />
                
                <button 
                  onClick={submitResponse} 
                  className="w-full brutal-btn bg-neon-green text-brutal-black py-6 text-xl flex items-center justify-center gap-3"
                >
                  Submit Response <Send size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'responding' && (
            <motion.div 
              key="responding"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-8"
            >
              <div className="text-7xl animate-bounce">🎉</div>
              <div className="space-y-4">
                <h1 className="text-4xl font-display uppercase italic text-white leading-none">Response Sent!</h1>
                <p className="text-gallery-white/40 font-mono text-sm uppercase tracking-widest">
                  Your response has been sent to @{invite?.challengerName}.
                </p>
              </div>
              
              <div className="brutal-border bg-neon-green/10 border-neon-green p-12">
                <p className="text-neon-green font-mono text-xs uppercase tracking-widest animate-pulse">
                  Generating next challenge...
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <button onClick={() => navigate('/truthordare')} className="brutal-btn bg-gallery-white/10 text-white py-4 font-bold uppercase tracking-widest brutal-border">
                  Play Another Round →
                </button>
                <button onClick={() => navigate('/')} className="text-gallery-white/20 font-mono text-[10px] uppercase tracking-widest hover:text-white transition-colors">
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
