import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import { fetchWithAuth } from "../utils/apiUtils";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import MomentCapture from "../components/MomentCapture";

export default function DuoBattlePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [battle, setBattle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [buildUpStage, setBuildUpStage] = useState<'loading' | 'analyzing' | 'calculating' | 'reveal'>('loading');

  useEffect(() => {
    if (id) {
      fetchBattle();
    }
  }, [id]);

  const fetchBattle = async () => {
    try {
      const res = await fetch(`/api/battle/${id}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBattle(data);
      setLoading(false);
      
      let sessionId = localStorage.getItem('voterSession');
      if (!sessionId) {
        sessionId = Math.random().toString(36).substr(2, 9);
        localStorage.setItem('voterSession', sessionId);
      }

      const voteCheck = await fetch(`/api/battle/${id}/has-voted`, { headers: { 'x-session-id': sessionId } });
      const voteData = await voteCheck.json();
      setHasVoted(voteData.hasVoted);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleVote = async (votedFor: string) => {
    if (hasVoted) {
      alert('You already voted in this battle!');
      return;
    }
    
    setBuildUpStage('analyzing');
    setTimeout(() => setBuildUpStage('calculating'), 1500);
    
    setTimeout(async () => {
      setBuildUpStage('reveal');
      try {
        let sessionId = localStorage.getItem('voterSession');
        if (!sessionId) {
          sessionId = Math.random().toString(36).substr(2, 9);
          localStorage.setItem('voterSession', sessionId);
        }

        const res = await fetch('/api/battle/duo-vote', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-session-id': sessionId
          },
          body: JSON.stringify({ battleId: id, votedFor })
        });
        
        if (res.ok) {
          setHasVoted(true);
          await fetchBattle();
          
          if (battle) {
             const newChallengerVotes = battle.challengerVotes + (votedFor === 'challenger' ? 1 : 0);
             const newOpponentVotes = battle.opponentVotes + (votedFor === 'opponent' ? 1 : 0);
             const newTotalVotes = battle.totalVotes + 1;
             
             const cPercent = (newChallengerVotes / newTotalVotes) * 100;
             const oPercent = (newOpponentVotes / newTotalVotes) * 100;
             
             if (cPercent >= 70 || oPercent >= 70) {
               setShowConfetti(true);
               setTimeout(() => setShowConfetti(false), 5000);
             }
          }
        }
      } catch (err) {
        console.error(err);
      }
      setTimeout(() => setBuildUpStage('loading'), 1500); // clear
    }, 3000);
  };

  const getThemeIcon = (theme: string) => {
    switch(theme) {
      case 'office': return '💼';
      case 'rap': return '🎤';
      case 'shakespeare': return '🎭';
      case 'twitter': return '🐦';
      default: return '🔥';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading battle arena...</p>
        </div>
      </div>
    );
  }

  if (!battle) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚔️</div>
          <h1 className="text-2xl text-white font-bold mb-2">Battle Not Found</h1>
          <button onClick={() => navigate('/')} className="bg-purple-600 px-6 py-2 rounded-full mt-4 text-white">Go Home</button>
        </div>
      </div>
    );
  }

  const isVotingActive = battle.status === 'voting' && new Date() < new Date(battle.votingEndsAt);
  const isCompleted = battle.status === 'completed';
  const isKnockout = battle.winType === 'knockout';
  const challengerPercent = battle.totalVotes > 0 ? (battle.challengerVotes / battle.totalVotes) * 100 : 0;
  const opponentPercent = battle.totalVotes > 0 ? (battle.opponentVotes / battle.totalVotes) * 100 : 0;

  return (
    <div className="min-h-screen bg-black py-8 px-4 font-sans pt-20">
      {showConfetti && <Confetti width={window.innerWidth} height={window.innerHeight} />}
      
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚔️</div>
          <h1 className="text-3xl font-bold text-white uppercase tracking-wider font-display">Roast Battle</h1>
          <p className="text-gray-400 mt-2">{battle.theme && `${getThemeIcon(battle.theme)} ${battle.theme.toUpperCase()} THEME`}</p>
          {isCompleted && battle.winnerId && (
             <div className={`mt-4 inline-block px-6 py-2 rounded-full ${isKnockout ? 'bg-gradient-to-r from-red-600 to-orange-600 animate-pulse' : 'bg-green-600'}`}>
               <span className="text-white font-bold">
                 🏆 WINNER: @{battle.winnerName} 🏆
               </span>
             </div>
          )}
        </div>
        
        {buildUpStage !== 'loading' && isVotingActive && !hasVoted && (
          <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center backdrop-blur-md">
            <div className="text-center">
              {buildUpStage === 'analyzing' && (
                <>
                  <div className="w-24 h-24 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-white text-2xl font-bold font-display tracking-widest">ANALYZING ROASTS</p>
                </>
              )}
              {buildUpStage === 'calculating' && (
                <>
                  <div className="text-6xl mb-4 animate-bounce">🤔</div>
                  <p className="text-white text-xl font-bold">Calculating savageness levels...</p>
                </>
              )}
              {buildUpStage === 'reveal' && (
                 <>
                  <div className="text-6xl mb-4 animate-ping">💥</div>
                  <p className="text-white text-2xl font-bold font-display text-red-500 tracking-wider">VOTE SUBMITTED</p>
                </>
              )}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 relative items-center">
          <div className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border-2 ${isCompleted && battle.winnerId === battle.challengerId ? 'border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.3)]' : 'border-gray-700/50'}`}>
            <div className="text-center">
              <div className="w-32 h-32 rounded-full mx-auto overflow-hidden border-4 border-purple-500 mb-4 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                <img src={battle.challengerRoast?.photoUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${battle.challengerId}`} alt="Challenger" className="w-full h-full object-cover" />
              </div>
              <h2 className="text-2xl font-bold text-white font-display tracking-wide uppercase">@{battle.challengerName}</h2>
              {battle.challengerRoast?.savagenessScore !== undefined && (
                <div className="flex justify-center gap-4 mt-3 text-sm font-bold bg-black/40 py-2 rounded-full mx-auto w-max px-4 border border-white/5">
                  <span className="text-red-400">🔥 {battle.challengerRoast.savagenessScore}/10</span>
                  <span className="text-purple-400">🎨 {battle.challengerRoast.creativityScore}/10</span>
                </div>
              )}
              <div className="mt-6 bg-black/60 rounded-2xl p-6 border border-white/5 relative">
                <div className="absolute -top-3 -left-2 text-4xl text-purple-500 opacity-50 font-serif">"</div>
                <p className="text-white text-lg font-medium leading-relaxed z-10 relative">
                  {battle.challengerRoast?.text || "..."}
                </p>
              </div>
              
              {battle.challengerRoast && (
                 <div className="flex justify-center mt-4">
                   <MomentCapture roast={battle.challengerRoast}>
                      <span className="text-sm text-gray-500 hover:text-purple-400 transition cursor-pointer flex items-center gap-2">
                         📸 Capture
                      </span>
                   </MomentCapture>
                 </div>
              )}

              <div className="mt-8">
                <div className="text-4xl font-bold text-white font-display">{battle.challengerVotes}</div>
                <div className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">votes</div>
                <div className="w-full bg-gray-800 rounded-full h-3 mt-4 overflow-hidden border border-white/5">
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${challengerPercent}%` }}></div>
                </div>
              </div>
              {isVotingActive && !hasVoted && (
                <button onClick={() => handleVote('challenger')} className="w-full mt-6 bg-white hover:bg-gray-200 text-brutal-black font-bold py-4 rounded-xl transition-all transform hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] uppercase tracking-wider text-sm">
                  🔥 Vote This Roast
                </button>
              )}
            </div>
          </div>
          
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-black p-4 rounded-full border-4 border-gray-800 shadow-2xl hidden md:block">
            <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-red-500 to-orange-500 animate-pulse font-display italic">VS</div>
          </div>

          <div className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border-2 ${isCompleted && battle.winnerId === battle.opponentId ? 'border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.3)]' : 'border-gray-700/50'}`}>
            <div className="text-center">
              <div className="w-32 h-32 rounded-full mx-auto overflow-hidden border-4 border-pink-500 mb-4 opacity-10 shadow-[0_0_20px_rgba(236,72,153,0.4)] transition-opacity duration-500" style={{ opacity: battle.opponentRoast ? 1 : 0.5 }}>
                <img src={battle.opponentRoast?.photoUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${battle.opponentId}`} alt="Opponent" className="w-full h-full object-cover" />
              </div>
              <h2 className="text-2xl font-bold text-white font-display tracking-wide uppercase">@{battle.opponentName || 'Waiting...'}</h2>
              {battle.opponentRoast?.savagenessScore !== undefined && (
                <div className="flex justify-center gap-4 mt-3 text-sm font-bold bg-black/40 py-2 rounded-full mx-auto w-max px-4 border border-white/5">
                  <span className="text-red-400">🔥 {battle.opponentRoast.savagenessScore}/10</span>
                  <span className="text-purple-400">🎨 {battle.opponentRoast.creativityScore}/10</span>
                </div>
              )}
              <div className="mt-6 bg-black/60 rounded-2xl p-6 border border-white/5 relative min-h-[100px] flex items-center justify-center">
                 {!battle.opponentRoast ? (
                    <p className="text-gray-500 font-medium animate-pulse">Waiting for opponent to respond...</p>
                 ) : (
                    <>
                      <div className="absolute -top-3 -left-2 text-4xl text-pink-500 opacity-50 font-serif">"</div>
                      <p className="text-white text-lg font-medium leading-relaxed z-10 relative text-left">
                        {battle.opponentRoast.text}
                      </p>
                    </>
                 )}
              </div>

               {battle.opponentRoast && (
                 <div className="flex justify-center mt-4">
                   <MomentCapture roast={battle.opponentRoast}>
                      <span className="text-sm text-gray-500 hover:text-pink-400 transition cursor-pointer flex items-center gap-2">
                         📸 Capture
                      </span>
                   </MomentCapture>
                 </div>
              )}

              {battle.opponentRoast && (
                <>
                  <div className="mt-8">
                    <div className="text-4xl font-bold text-white font-display">{battle.opponentVotes}</div>
                    <div className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">votes</div>
                    <div className="w-full bg-gray-800 rounded-full h-3 mt-4 overflow-hidden border border-white/5">
                      <div className="bg-gradient-to-r from-pink-600 to-orange-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${opponentPercent}%` }}></div>
                    </div>
                  </div>
                  {isVotingActive && !hasVoted && (
                    <button onClick={() => handleVote('opponent')} className="w-full mt-6 bg-white hover:bg-gray-200 text-brutal-black font-bold py-4 rounded-xl transition-all transform hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] uppercase tracking-wider text-sm">
                      🔥 Vote This Roast
                    </button>
                  )}
                </>
              )}
              
              {!battle.opponentRoast && isCompleted === false && (
                <div className="mt-10 mb-4">
                  <div className="inline-block px-4 py-2 bg-gray-800 rounded-full text-sm font-bold text-gray-400 border border-gray-700">RESPONSE PENDING</div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-12 bg-gray-900/50 rounded-3xl p-6 border border-gray-800 text-center flex flex-wrap justify-around items-center gap-6 shadow-[0_0_30px_rgba(0,0,0,0.5)] inset-0">
          <div>
            <div className="text-gray-500 text-xs font-bold tracking-widest uppercase mb-1">Total Votes</div>
            <div className="text-white text-3xl font-display">{battle.totalVotes}</div>
          </div>
          <div className="w-px h-12 bg-gray-800 hidden sm:block"></div>
          <div>
            <div className="text-gray-500 text-xs font-bold tracking-widest uppercase mb-1">Status</div>
             <div className="text-white text-xl font-bold">
               {isVotingActive ? (
                 <span className="text-green-400 animate-pulse flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-400"></span> Live</span>
               ) : isCompleted ? (
                 <span className="text-yellow-500">Completed</span>
               ) : (
                 <span className="text-gray-400">Closed</span>
               )}
             </div>
          </div>
          <div className="w-px h-12 bg-gray-800 hidden sm:block"></div>
          <div>
            <div className="text-gray-500 text-xs font-bold tracking-widest uppercase mb-1">Battle Theme</div>
            <div className="text-white text-xl capitalize font-bold">{getThemeIcon(battle.theme)} {battle.theme}</div>
          </div>
        </div>
        
        <div className="mt-8 text-center pb-12">
          <button onClick={() => {
            const link = `https://games.roastme.site${window.location.pathname}${window.location.search}`;
            navigator.clipboard.writeText(link);
            alert('Battle link copied! Share it for more votes.');
          }} className="bg-transparent border-2 border-gray-700 hover:border-gray-500 text-white px-8 py-4 rounded-xl transition-all transform hover:scale-105 font-bold uppercase tracking-widest text-sm hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            🔗 Copy Link to Share
          </button>
        </div>
      </div>
    </div>
  );
}
