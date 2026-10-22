import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/apiUtils';
import { motion, AnimatePresence } from 'motion/react';
import { Award, CheckCircle } from 'lucide-react';

export default function DailyTrivia() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  
  useEffect(() => {
    loadQuestions();
  }, []);
  
  const loadQuestions = async () => {
    try {
      const res = await fetchWithAuth('/api/trivia/daily-questions');
      const data = await res.json();
      
      const uncompleted = data.filter((q: any) => !q.alreadySeen);
      
      if (uncompleted.length === 0) {
        setFinished(true);
      } else {
        setQuestions(uncompleted);
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };
  
  const handleAnswer = async (answer: string) => {
    const q = questions[currentIdx];
    const isCorrect = q.correctAnswer === answer;
    
    if (isCorrect) setScore(prev => prev + 1);
    
    try {
      await fetchWithAuth('/api/trivia/daily-questions/seen', {
        method: 'POST',
        body: JSON.stringify({ questionId: q.id })
      });
    } catch (e) {}
    
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(prev => prev + 1);
    } else {
      setFinished(true);
      if (score + (isCorrect ? 1 : 0) >= 7) {
        // give bonus? handled client side for demo
      }
    }
  };
  
  if (loading) return <div className="animate-pulse h-32 bg-white/5 rounded-xl"></div>;
  
  if (finished) {
    return (
      <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 border border-green-500/30 rounded-2xl p-6 text-center">
        <CheckCircle className="mx-auto text-green-400 w-12 h-12 mb-2" />
        <h3 className="text-xl font-bold text-white mb-1">Daily 10 Complete!</h3>
        <p className="text-green-300 font-mono text-sm">You scored {score}/{questions.length}. Come back tomorrow for fresh questions!</p>
      </div>
    );
  }
  
  const currentQ = questions[currentIdx];
  
  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-2xl p-6 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-colors"></div>
      
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Award className="text-yellow-400" /> Daily 10 Challenge
          </h3>
          <span className="font-mono text-sm bg-black/40 px-3 py-1 rounded-full text-purple-300">
            {currentIdx + 1} / {questions.length}
          </span>
        </div>
        
        <p className="text-lg text-gallery-white mb-6 font-medium">{currentQ?.question}</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {currentQ?.options?.map((opt: string, i: number) => (
            <button 
              key={i}
              onClick={() => handleAnswer(opt)}
              className="bg-black/40 hover:bg-purple-600 border border-white/10 hover:border-purple-400 text-white p-3 rounded-lg text-left transition-colors font-medium text-sm"
            >
              <span className="opacity-50 mr-2 font-mono">{['A','B','C','D'][i]}.</span>
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
