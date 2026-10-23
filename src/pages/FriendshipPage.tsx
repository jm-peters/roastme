import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Heart, Share2, Copy, ArrowLeft, RefreshCw, CheckCircle2, XCircle, Trophy, Zap } from 'lucide-react';
import { useToast } from '../components/Toast';
import { cn } from '../lib/utils';

interface Question {
  question: string;
  options: string[];
  selectedAnswer?: string;
}

export default function FriendshipPage() {
  const navigate = useNavigate();
  const { challengeId } = useParams();
  const { showToast } = useToast();
  
  const [step, setStep] = useState<'select' | 'customizing' | 'answering' | 'share' | 'results'>('select');
  const [questionPool, setQuestionPool] = useState<any[]>([]);
  const [challengeType, setChallengeType] = useState('custom');
  const [selectedQuestions, setSelectedQuestions] = useState<any[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [shareLink, setShareLink] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [matchResult, setMatchResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rivalryMode, setRivalryMode] = useState(false);

  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');

  useEffect(() => {
    if (challengeId) {
      navigate(`/friendship/accept/${challengeId}`, { replace: true });
      return;
    }

    fetch('/api/friendship/question-pool')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data?.questions) && data.questions.length > 0) {
          setQuestionPool(data.questions);
        }
      })
      .catch(console.warn);
  }, [challengeId, navigate]);

  const selectChallengeType = (type: string) => {
    setChallengeType(type);
    
    // Filter questions by category (or fallback to pool)
    const filtered = questionPool.filter(q => q.category === type);
    const sourceQuestions = filtered.length >= 10 ? filtered : questionPool;
    
    if (type === 'custom') {
      setStep('customizing');
      setSelectedQuestions(sourceQuestions.slice(0, 10)); // Default to first 10
    } else {
      // Skip customizing for predefined categories
      const selected = sourceQuestions.slice(0, 10);
      const formattedQuestions = selected.map(q => ({
        question: q.question,
        options: q.options,
        selectedAnswer: ''
      }));
      setQuestions(formattedQuestions);
      setAnswers({});
      setStep('answering');
    }
  };

  const toggleQuestion = (question: any) => {
    const exists = selectedQuestions.find(q => q.id === question.id);
    if (exists) {
      setSelectedQuestions(prev => prev.filter(q => q.id !== question.id));
    } else {
      if (selectedQuestions.length < 10) {
        setSelectedQuestions(prev => [...prev, question]);
      } else {
        showToast('Maximum 10 questions allowed', 'error');
      }
    }
  };

  const startChallenge = () => {
    if (selectedQuestions.length !== 10) {
      showToast(`Please select exactly 10 questions. You have ${selectedQuestions.length}.`, 'error');
      return;
    }
    
    const formattedQuestions = selectedQuestions.map(q => ({
      question: q.question,
      options: q.options,
      selectedAnswer: ''
    }));
    
    setQuestions(formattedQuestions);
    setAnswers({});
    setStep('answering');
  };

  const saveAnswer = (answer: string) => {
    const updatedAnswers = {
      ...answers,
      [currentQuestionIndex]: answer
    };
    setAnswers(updatedAnswers);
    
    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      createChallenge(updatedAnswers);
    }
  };

  const createChallenge = async (finalAnswers: Record<number, string>) => {
    let currentUserId = userId || localStorage.getItem('userId');
    if (!currentUserId) {
      currentUserId = 'guest_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('userId', currentUserId);
    }
    const currentUsername = username || localStorage.getItem('username') || 'A Friend';

    setLoading(true);
    try {
      const res = await fetch('/api/friendship/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          username: currentUsername,
          challengeType,
          rivalryMode,
          questions: questions.map((q, idx) => ({
            question: q.question,
            options: q.options,
            creatorAnswer: finalAnswers[idx]
          }))
        })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create challenge');
      }
      const code = data.shareCode || data.challengeId;
      setGameCode(code);
      setShareLink(`https://games.roastme.site/friendship/accept/${data.challengeId || code}`);
      setStep('share');
      showToast('Challenge created! 🤝');
    } catch (err: any) {
      showToast(err.message || 'Failed to create challenge', 'error');
    } finally {
      setLoading(false);
    }
  };

  const submitFriendAnswers = async () => {
    if (Object.keys(answers).length < questions.length) {
      showToast('Please answer all questions!', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/friendship/challenge/${gameCode}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responderId: userId,
          responderName: username || 'Anonymous',
          answers: Object.values(answers)
        })
      });
      const data = await res.json();
      checkResults();
      showToast('Answers submitted! 📊');
    } catch (err) {
      showToast('Failed to submit answers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const checkResults = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/friendship/results/${gameCode}`);
      const data = await res.json();
      setMatchResult(data);
      setStep('results');
    } catch (err) {
      showToast('Failed to fetch results', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    showToast('Link copied to clipboard! 📋');
  };

  return (
    <div className="flex flex-col bg-brutal-black selection:bg-neon-green selection:text-brutal-black">
      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-4">
        <div className="flex justify-between items-center mb-8">
          <button onClick={() => navigate('/')} className="text-gallery-white/40 hover:text-neon-green transition-colors flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest">
            <ArrowLeft size={14} /> Back to Roast
          </button>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" />
            <span className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest">Friendship Mode</span>
          </div>
        </div>

        <section className="text-center mb-8 space-y-2">
          <motion.h1 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-5xl md:text-7xl leading-none uppercase font-display"
          >
            WHO KNOWS <span className="text-pink-500">ME?</span>
          </motion.h1>
          <p className="text-gallery-white/60 font-mono text-xs uppercase tracking-[0.3em]">
            Multiple choice • 10 Questions • Real results
          </p>
        </section>

        <AnimatePresence mode="wait">
          {step === 'select' && (
            <motion.div 
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid gap-4"
            >
              <h2 className="text-white font-display text-xl uppercase mb-2">Select a Challenge Type</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={() => selectChallengeType('custom')} className="bg-gallery-white/5 hover:bg-gallery-white/10 brutal-border p-6 text-left group transition-all">
                  <div className="text-3xl mb-4">🎲</div>
                  <h3 className="text-white font-display text-lg uppercase group-hover:text-pink-500 transition-colors">Custom Challenge</h3>
                  <p className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest">Create your own set of questions</p>
                </button>
                
                <button onClick={() => selectChallengeType('couples')} className="bg-gallery-white/5 hover:bg-gallery-white/10 brutal-border p-6 text-left group transition-all">
                  <div className="text-3xl mb-4">💕</div>
                  <h3 className="text-white font-display text-lg uppercase group-hover:text-pink-500 transition-colors">Couples Edition</h3>
                  <p className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest">Romantic questions for partners</p>
                </button>
                
                <button onClick={() => selectChallengeType('best_friends')} className="bg-gallery-white/5 hover:bg-gallery-white/10 brutal-border p-6 text-left group transition-all">
                  <div className="text-3xl mb-4">👯</div>
                  <h3 className="text-white font-display text-lg uppercase group-hover:text-pink-500 transition-colors">Best Friends</h3>
                  <p className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest">Test how well your bestie knows you</p>
                </button>
                
                <button onClick={() => selectChallengeType('siblings')} className="bg-gallery-white/5 hover:bg-gallery-white/10 brutal-border p-6 text-left group transition-all">
                  <div className="text-3xl mb-4">👨‍👩‍👧</div>
                  <h3 className="text-white font-display text-lg uppercase group-hover:text-pink-500 transition-colors">Siblings Edition</h3>
                  <p className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest">Memories and family bonds</p>
                </button>

                <button onClick={() => selectChallengeType('dark_secrets')} className="bg-gallery-white/5 hover:bg-gallery-white/10 brutal-border p-6 text-left group transition-all">
                  <div className="text-3xl mb-4">😈</div>
                  <h3 className="text-white font-display text-lg uppercase group-hover:text-pink-500 transition-colors">Dark Secrets</h3>
                  <p className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest">Spicy and hidden truths</p>
                </button>

                <button onClick={() => selectChallengeType('would_they_rather')} className="bg-gallery-white/5 hover:bg-gallery-white/10 brutal-border p-6 text-left group transition-all">
                  <div className="text-3xl mb-4">⚖️</div>
                  <h3 className="text-white font-display text-lg uppercase group-hover:text-pink-500 transition-colors">Would They Rather</h3>
                  <p className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest">Difficult choices</p>
                </button>
              </div>

              <div className="mt-4 flex items-center bg-gallery-white/5 brutal-border p-4">
                <input 
                  type="checkbox" 
                  id="rivalry_mode"
                  className="mr-3 w-5 h-5 accent-pink-500"
                  onChange={(e) => setRivalryMode(e.target.checked)}
                />
                <label htmlFor="rivalry_mode" className="text-white font-display text-sm uppercase">Enable Rivalry Mode (60s limit per question)</label>
              </div>
            </motion.div>
          )}

          {step === 'customizing' && (
            <motion.div 
              key="customizing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="text-white font-display text-2xl uppercase">Select 10 Questions</h2>
                <p className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest">Choose {selectedQuestions.length}/10 questions</p>
                <div className="w-full bg-gallery-white/10 h-1 mt-4 brutal-border overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(selectedQuestions.length / 10) * 100}%` }}
                    className="h-full bg-pink-500"
                  />
                </div>
              </div>
              
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                {questionPool.filter(q => q.category === challengeType).map((q) => (
                  <button
                    key={q.id}
                    onClick={() => toggleQuestion(q)}
                    className={cn(
                      "w-full p-4 brutal-border text-left transition-all flex justify-between items-center group",
                      selectedQuestions.find(sq => sq.id === q.id)
                        ? "bg-pink-500/10 border-pink-500"
                        : "bg-gallery-white/5 border-gallery-white/10 hover:border-gallery-white/30"
                    )}
                  >
                    <span className={cn(
                      "text-sm font-mono uppercase tracking-wider",
                      selectedQuestions.find(sq => sq.id === q.id) ? "text-white" : "text-gallery-white/40"
                    )}>{q.question}</span>
                    <span className={cn(
                      "text-xl",
                      selectedQuestions.find(sq => sq.id === q.id) ? "text-pink-500" : "text-gallery-white/20"
                    )}>
                      {selectedQuestions.find(sq => sq.id === q.id) ? '✓' : '+'}
                    </span>
                  </button>
                ))}
              </div>
              
              <button 
                onClick={startChallenge} 
                disabled={selectedQuestions.length !== 10}
                className="w-full bg-pink-500 text-white py-4 font-display uppercase tracking-widest brutal-border hover:bg-white hover:text-brutal-black transition-all disabled:opacity-50"
              >
                {selectedQuestions.length === 10 ? 'Continue to Answer →' : `Select ${10 - selectedQuestions.length} more`}
              </button>
            </motion.div>
          )}

          {step === 'answering' && questions.length > 0 && (
            <motion.div 
              key="answering"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-center">
                <span className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest">Question {currentQuestionIndex + 1} of {questions.length}</span>
                <div className="flex gap-1">
                  {questions.map((_, i) => (
                    <div key={i} className={`w-2 h-1 ${i <= currentQuestionIndex ? 'bg-pink-500' : 'bg-gallery-white/10'}`} />
                  ))}
                </div>
              </div>

              <div className="brutal-border bg-gallery-white/5 p-8">
                <h2 className="text-white font-display text-2xl uppercase mb-8 leading-tight">{questions[currentQuestionIndex].question}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {questions[currentQuestionIndex].options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => saveAnswer(option)}
                      className={cn(
                        "p-4 brutal-border text-left font-mono text-xs uppercase tracking-widest transition-all",
                        answers[currentQuestionIndex] === option 
                          ? "bg-pink-500 text-white border-pink-500" 
                          : "bg-brutal-black text-gallery-white/60 border-gallery-white/20 hover:border-pink-500 hover:text-white"
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === 'share' && (
            <motion.div 
              key="share"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-8"
            >
              <div className="brutal-border bg-green-500/10 border-green-500 p-12">
                <div className="text-6xl mb-6">🎉</div>
                <h2 className="text-white font-display text-3xl uppercase mb-4">Challenge Created!</h2>
                <p className="text-gallery-white/60 font-mono text-xs uppercase tracking-widest mb-8">
                  Share this link with your friend to see if they really know you.
                </p>
                <div className="flex gap-2 max-w-md mx-auto mb-8">
                  <input 
                    type="text" 
                    value={shareLink} 
                    readOnly 
                    className="flex-1 bg-brutal-black border border-gallery-white/20 px-4 py-3 text-gallery-white font-mono text-xs" 
                  />
                  <button 
                    onClick={copyLink} 
                    className="bg-neon-green text-brutal-black p-3 brutal-border hover:bg-white transition-colors"
                  >
                    <Copy size={20} />
                  </button>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex gap-4">
                    <button 
                      onClick={() => {
                        fetch('/api/activity/click', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ linkType: 'friendship', linkId: gameCode, referrerId: userId })
                        });
                        window.open(`https://wa.me/?text=${encodeURIComponent(`How well do you know me? ${shareLink}`)}`, '_blank');
                      }} 
                      className="flex-1 bg-green-600 text-white py-3 font-bold uppercase tracking-widest brutal-border hover:bg-white hover:text-brutal-black transition-all text-[10px]"
                    >
                      WhatsApp Status
                    </button>
                    <button 
                      onClick={checkResults} 
                      className="flex-1 bg-gallery-white/10 text-white py-3 font-bold uppercase tracking-widest brutal-border hover:bg-white hover:text-brutal-black transition-all text-[10px]"
                    >
                      Check Results →
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => navigate('/prank')} 
                      className="bg-gallery-white/5 text-gallery-white/60 py-3 font-bold uppercase tracking-widest brutal-border hover:bg-white hover:text-brutal-black transition-all text-[10px]"
                    >
                      🎭 Prank Them
                    </button>
                    <button 
                      onClick={() => navigate('/truthordare')} 
                      className="bg-gallery-white/5 text-gallery-white/60 py-3 font-bold uppercase tracking-widest brutal-border hover:bg-white hover:text-brutal-black transition-all text-[10px]"
                    >
                      🎲 Truth or Dare
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'results' && matchResult && (
            <motion.div 
              key="results"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8"
            >
              <div className="text-center space-y-6">
                <div className={`text-8xl mb-4 ${matchResult.matchScore >= 70 ? 'text-green-500' : matchResult.matchScore >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {matchResult.matchScore >= 70 ? <Trophy className="mx-auto" size={80} /> : matchResult.matchScore >= 40 ? <Heart className="mx-auto" size={80} /> : <XCircle className="mx-auto" size={80} />}
                </div>
                <h2 className="text-5xl font-display uppercase text-white">{matchResult.matchScore}% MATCH!</h2>
                <p className="text-gallery-white/60 font-mono text-xs uppercase tracking-widest">
                  {matchResult.matchScore >= 70 ? "You two are basically the same person!" : 
                   matchResult.matchScore >= 40 ? "You know each other... kinda." : 
                   "Time to hang out more!"}
                </p>
              </div>

              <div className="brutal-border bg-gallery-white/5 p-8">
                <h3 className="text-white font-display text-xl uppercase mb-6 border-b border-gallery-white/10 pb-4">Comparison</h3>
                <div className="space-y-6">
                  {matchResult.comparisons.map((comp: any, idx: number) => (
                    <div key={idx} className="space-y-2 pb-6 border-b border-gallery-white/5 last:border-0">
                      <p className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest">{comp.question}</p>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div className="space-y-1">
                          <p className="text-[10px] font-mono text-gallery-white/20 uppercase">You said</p>
                          <p className="text-white font-mono text-sm">{comp.creatorAnswer}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-mono text-gallery-white/20 uppercase">Friend said</p>
                          <p className={`font-mono text-sm ${comp.match ? 'text-green-500' : 'text-red-500'}`}>
                            {comp.friendAnswer || "Not answered"}
                          </p>
                        </div>
                      </div>
                      {comp.match && <div className="text-green-500 text-[10px] font-mono uppercase tracking-widest flex items-center gap-1"><CheckCircle2 size={12} /> Match!</div>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <button 
                  onClick={() => { setStep('select'); setMatchResult(null); setAnswers({}); setCurrentQuestionIndex(0); }} 
                  className="flex-1 bg-pink-500 text-white py-4 font-bold uppercase tracking-widest brutal-border hover:bg-white hover:text-brutal-black transition-all"
                >
                  Play Again →
                </button>
                <button 
                  onClick={() => navigate('/')} 
                  className="flex-1 bg-neon-green text-brutal-black py-4 font-bold uppercase tracking-widest brutal-border hover:bg-white transition-colors"
                >
                  Back to RoastMe 🔥
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
