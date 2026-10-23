import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Trophy, ArrowRight, RefreshCw, AlertCircle, CheckCircle2, Share2 } from 'lucide-react';
import { useToast } from '../../components/Toast';
import MarqueeHeader from '../../components/MarqueeHeader';
import Footer from '../../components/Footer';

import { cn } from '../../lib/utils';

interface Question {
  question: string;
  options: string[];
}

interface ChallengeData {
  id: string;
  creatorUsername: string;
  questions: (string | Question)[];
  expiresAt: string;
  rivalryMode?: boolean;
}

export default function AcceptFriendshipChallenge() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [tempAnswer, setTempAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; matchCount: number; totalQuestions: number; comparisons: any[], totalPlays?: number, averageScore?: number, drifted?: boolean } | null>(null);
  const [responderName, setResponderName] = useState('');
  const [needsName, setNeedsName] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);

  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');

  useEffect(() => {
    if (code) {
      fetch(`/api/friendship/challenge/${code}`)
        .then(res => {
          if (!res.ok) throw new Error('Challenge not found or expired');
          return res.json();
        })
        .then(data => {
          setChallenge(data);
          setAnswers(new Array(data.questions.length).fill(''));
          setLoading(false);
          
          if (!username) {
            setNeedsName(true);
          }
        })
        .catch(err => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [code, username]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (challenge?.rivalryMode && !result && !needsName && !error && !loading) {
      if (timeLeft > 0) {
        timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      } else {
        // Auto-skip
        saveAnswer('');
      }
    }
    return () => clearTimeout(timer);
  }, [timeLeft, challenge?.rivalryMode, result, needsName, error, loading]);

  const saveAnswer = (answer: string) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = answer;
    setAnswers(newAnswers);
    setTimeLeft(60);
    
    if (currentQuestionIndex + 1 < (challenge?.questions.length || 0)) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      submitAnswersWithData(newAnswers);
    }
  };

  const goBack = () => {
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      setTempAnswer(answers[prevIndex] || '');
      setTimeLeft(60);
    }
  };

  const submitAnswersWithData = async (finalAnswers: string[]) => {
    if (finalAnswers.some(a => !challenge?.rivalryMode && !a)) {
      showToast('Please answer all questions before submitting', 'error');
      return;
    }
    
    if (needsName && !responderName.trim()) {
      showToast('Please enter your name', 'error');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const finalName = responderName.trim() || username || 'Anonymous';
      const currentUserId = userId || localStorage.getItem('userId') || 'guest_' + Math.random().toString(36).substr(2, 9);
      const res = await fetch(`/api/friendship/challenge/${code}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          answers: finalAnswers,
          responderId: currentUserId,
          responderName: finalName
        })
      });
      
      if (!res.ok) throw new Error('Failed to submit');
      const data = await res.json();
      
      // Hit v2 rematch API
      const v2Res = await fetch(`/api/v2/friendship/rematch`, {
         method: 'POST',
         headers: {'Content-Type': 'application/json'},
         body: JSON.stringify({ challengeId: code, score: data.score })
      });
      if (v2Res.ok) {
         const v2Data = await v2Res.json();
         setResult({ ...data, ...v2Data });
      } else {
         setResult(data);
      }
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRematch = () => {
    setCurrentQuestionIndex(0);
    setAnswers(new Array(challenge?.questions.length || 10).fill(''));
    setResult(null);
    setTempAnswer('');
    setTimeLeft(60);
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

  if (result) {
    return (
      <div className="min-h-screen bg-brutal-black flex flex-col">
        <MarqueeHeader />
        <main className="flex-1 max-w-2xl mx-auto w-full p-4 py-12 space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-display uppercase italic text-white">Friendship Score</h1>
            <p className="text-gallery-white/40 font-mono text-sm uppercase tracking-widest">
              How well you know @{challenge?.creatorUsername}
            </p>
          </div>

          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`brutal-border p-12 text-center space-y-4 ${
              result.score >= 70 ? 'bg-neon-green/10 border-neon-green' :
              result.score >= 40 ? 'bg-yellow-500/10 border-yellow-500' :
              'bg-red-500/10 border-red-500'
            }`}
          >
            <div className="text-6xl">
              {result.score >= 70 ? '💖' : result.score >= 40 ? '🤔' : '💔'}
            </div>
            <div className="text-6xl font-display uppercase italic text-white">
              {result.score}%
            </div>
            <p className="text-white text-lg font-mono uppercase tracking-widest">
              You got {result.matchCount}/{result.totalQuestions} correct
            </p>
            <p className="text-gallery-white/60 font-mono text-sm uppercase tracking-widest">
              {result.score >= 70 ? "Legendary Bond!" : 
               result.score >= 40 ? "Getting there!" : 
               "Time for a deep talk..."}
            </p>
            {result.drifted && (
              <div className="mt-4 p-4 bg-black border border-red-500 rounded-lg shadow-[4px_4px_0px_0px_rgba(239,68,68,1)] text-white">
                <span className="text-3xl block mb-2">💔</span>
                <p className="font-display uppercase text-red-500">You've drifted apart!</p>
                <p className="font-mono text-[10px] text-gallery-white/50">Your average score dropped below 40%.</p>
              </div>
            )}
            
            <a 
               href={`/api/v2/og-image?title=${encodeURIComponent('Friendship Score')}&message=${encodeURIComponent(`@${responderName} and @${challenge?.creatorUsername} are ${result.score}% soulmates 👯`)}`}
               download="soulmates.png"
               target="_blank"
               className="mt-6 inline-flex items-center gap-2 bg-pink-500 text-white font-mono text-xs uppercase px-4 py-2 hover:bg-pink-600 transition-colors rounded-sm"
            >
               <Share2 size={14} /> Download Share Card
            </a>
          </motion.div>

          <div className="space-y-4">
            <h3 className="text-white font-display uppercase italic text-xl">Comparison</h3>
            <div className="space-y-3">
              {result.comparisons.map((comp: any, idx: number) => (
                <div key={idx} className="bg-gallery-white/5 brutal-border p-4 space-y-2">
                  <p className="text-gallery-white/40 font-mono text-[10px] uppercase">{comp.question}</p>
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <p className="text-[8px] font-mono text-gallery-white/20 uppercase">@{challenge?.creatorUsername}</p>
                      <p className="text-white font-mono text-sm">{comp.creatorAnswer}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-[8px] font-mono text-gallery-white/20 uppercase">You</p>
                      <p className={`font-mono text-sm ${comp.match ? 'text-neon-green' : 'text-red-500'}`}>
                        {comp.friendAnswer}
                      </p>
                    </div>
                  </div>
                  {comp.match && (
                    <div className="flex items-center gap-1 text-neon-green text-[8px] font-mono uppercase">
                      <CheckCircle2 size={10} /> Match!
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-8">
            <button onClick={handleRematch} className="w-full brutal-btn bg-pink-500 text-white py-5 font-bold uppercase tracking-widest brutal-border hover:scale-[1.02] transition-all text-lg shadow-[4px_4px_0px_0px_rgba(236,72,153,1)]">
              🔄 Quick Rematch
            </button>
            <button onClick={() => navigate('/friendship')} className="w-full brutal-btn bg-neon-green text-brutal-black py-4 font-bold uppercase tracking-widest brutal-border hover:bg-neon-green/90 transition-all">
              📝 Create Your Own Challenge
            </button>
            <button onClick={() => navigate('/truthordare')} className="w-full brutal-btn bg-gallery-white/5 text-white py-4 font-bold uppercase tracking-widest brutal-border hover:bg-gallery-white/10 transition-all flex items-center justify-center gap-3">
              🎲 Try Truth or Dare
            </button>
            <button onClick={() => navigate('/prank')} className="w-full brutal-btn bg-gallery-white/5 text-white py-4 font-bold uppercase tracking-widest brutal-border hover:bg-gallery-white/10 transition-all flex items-center justify-center gap-3">
              🎭 Send a Prank
            </button>
            <button onClick={() => navigate('/')} className="w-full text-gallery-white/20 font-mono text-[10px] uppercase tracking-widest hover:text-white transition-colors pt-4 text-center">
              Back to RoastMe →
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const currentQuestion = challenge?.questions[currentQuestionIndex];
  const questionText = typeof currentQuestion === 'string' ? currentQuestion : currentQuestion?.question;
  const options = typeof currentQuestion === 'string' ? ['Option A', 'Option B', 'Option C', 'Option D'] : currentQuestion?.options;

  return (
    <div className="min-h-screen bg-brutal-black flex flex-col">
      <MarqueeHeader />
      <main className="flex-1 max-w-2xl mx-auto w-full p-4 py-12 space-y-8">
        <div className="text-center space-y-4 relative">
          {challenge?.rivalryMode && (
            <div className="absolute top-0 right-0 p-2 bg-red-500 text-white font-mono text-xl border-2 border-black rounded-full w-12 h-12 flex items-center justify-center animate-pulse">
               {timeLeft}
            </div>
          )}
          <div className="text-5xl">🤝</div>
          <h1 className="text-3xl font-display uppercase italic text-white">The Ultimate Test</h1>
          <p className="text-gallery-white/40 font-mono text-sm uppercase tracking-widest leading-relaxed">
            @{challenge?.creatorUsername} challenged you! Answer these questions to see how well you really know them.
          </p>
        </div>

        {needsName && (
          <div className="brutal-border bg-yellow-500/10 border-yellow-500 p-6 space-y-4">
            <p className="text-yellow-500 font-mono text-[10px] uppercase tracking-widest block">📝 Before you start:</p>
            <input
              type="text"
              value={responderName}
              onChange={(e) => setResponderName(e.target.value)}
              placeholder="Enter your name (shown to challenger)"
              className="w-full bg-brutal-black border border-gallery-white/20 px-4 py-3 text-gallery-white font-mono text-sm focus:outline-none focus:border-yellow-500"
            />
            <button 
              onClick={() => setNeedsName(false)}
              disabled={!responderName.trim()}
              className="w-full bg-neon-green text-brutal-black py-3 font-display uppercase tracking-widest brutal-border hover:bg-white transition-all disabled:opacity-50"
            >
              Start Challenge →
            </button>
          </div>
        )}
        
        {!needsName && (
          <div className="brutal-border bg-gallery-white/5 p-8 space-y-8">
            <div className="flex justify-between items-center">
              <button 
                onClick={goBack} 
                className={`text-gallery-white/40 hover:text-neon-green transition-colors flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest ${currentQuestionIndex === 0 ? 'invisible' : ''}`}
              >
                ← Previous
              </button>
              <span className="text-gallery-white/20 font-mono text-[10px] uppercase tracking-[0.2em]">
                Question {currentQuestionIndex + 1} / {challenge?.questions.length}
              </span>
              <div className="w-16"></div>
            </div>

            <div className="h-1 w-full bg-gallery-white/10">
              <motion.div 
                className="h-full bg-neon-green"
                initial={{ width: 0 }}
                animate={{ width: `${((currentQuestionIndex + 1) / (challenge?.questions.length || 1)) * 100}%` }}
              />
            </div>

            <h2 className="text-2xl text-white font-display uppercase italic leading-tight">
              {questionText}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {options?.map((option: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => saveAnswer(option)}
                  className={cn(
                    "p-4 brutal-border text-left font-mono text-xs uppercase tracking-widest transition-all",
                    answers[currentQuestionIndex] === option 
                      ? "bg-neon-green text-brutal-black border-neon-green" 
                      : "bg-brutal-black text-gallery-white/60 border-gallery-white/20 hover:border-neon-green hover:text-white"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {currentQuestionIndex === (challenge?.questions.length || 0) - 1 && answers[currentQuestionIndex] && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => {
              submitAnswersWithData(answers);
            }}
            disabled={submitting}
            className="w-full brutal-btn bg-neon-green text-brutal-black py-6 text-xl"
          >
            {submitting ? <RefreshCw className="animate-spin mx-auto" /> : "Submit Answers →"}
          </motion.button>
        )}
      </main>
      <Footer />
    </div>
  );
}
