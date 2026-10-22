import { useState, useEffect, useRef } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { auth } from "../../firebase";
import { Zap, Trophy, Gamepad2, Medal, ArrowLeft, Flame, Star, Crown, Heart, Target, Coins } from "lucide-react";
import { cn } from "../../lib/utils";
import { fetchWithAuth, retryWithBackoff } from "../../utils/apiUtils";
import confetti from "canvas-confetti";
import ShareInvite from "../../components/games/ShareInvite";

// ═══════════════════════════════════════════════════════════════════
// GAMES & TRIVIA — COMPLETE SECTION v2.0
// Dark theme • XP system • Streaks • All modes • New games
// ═══════════════════════════════════════════════════════════════════

import { BIBLE_Q, FOOTBALL_Q, EDUCATION_Q, RAPID_Q, MYSTERY_Q, WHOS_THAT, CHAIN_SETS, getUnseen, HEALTH_WELLNESS_Q } from "../../lib/triviaBanks";

// ─── GAME MODE CONFIG ────────────────────────────────────────────
const MODES = [
  {id:"health",     label:"Health & Wellness",emoji:"🧘",  color:"#34d399", glow:"rgba(52,211,153,.22)",  desc:"4 questions · Body & Mind",              bank:HEALTH_WELLNESS_Q, type:"trivia"},
  {id:"bible",      label:"Bible Trivia",      emoji:"✝️",  color:"#a78bfa", glow:"rgba(167,139,250,.22)", desc:"150 questions · 10+ days fresh",       bank:BIBLE_Q,     type:"trivia"},
  {id:"football",   label:"Football Trivia",   emoji:"⚽",  color:"#34d399", glow:"rgba(52,211,153,.22)",  desc:"150 questions · World football coverage", bank:FOOTBALL_Q,  type:"trivia"},
  {id:"battle",     label:"Battle Mode",       emoji:"⚔️",  color:"#f87171", glow:"rgba(248,113,113,.22)", desc:"Head-to-head. One survives.",             type:"battle"},
  {id:"gauntlet",   label:"Gauntlet Mode",     emoji:"🛡️",  color:"#fb923c", glow:"rgba(251,146,60,.22)",  desc:"All categories. 3 lives. No mercy.",     type:"gauntlet"},
  {id:"education",  label:"Educational",       emoji:"🎓",  color:"#60a5fa", glow:"rgba(96,165,250,.22)",  desc:"150 questions · Science to Literature",  bank:EDUCATION_Q, type:"trivia"},
  {id:"rapid",      label:"Rapid Fire",        emoji:"⚡",  color:"#fbbf24", glow:"rgba(251,191,36,.22)",  desc:"80 questions · 15 seconds each",         bank:RAPID_Q,     type:"rapid"},
  {id:"mystery",    label:"Mystery Box",       emoji:"🎭",  color:"#e879f9", glow:"rgba(232,121,249,.22)", desc:"50 riddles · Think sideways",            bank:MYSTERY_Q,   type:"trivia"},
  {id:"whos_that",  label:"Who's That?",       emoji:"🕵️",  color:"#f59e0b", glow:"rgba(245,158,11,.22)",  desc:"40 profiles · Guess from clues.",        bank:WHOS_THAT,   type:"whos_that"},
  {id:"chain",      label:"Chain Reaction",    emoji:"🔗",  color:"#2dd4bf", glow:"rgba(45,212,191,.22)",  desc:"Each answer unlocks the next.",          bank:CHAIN_SETS[0], type:"chain"},
];

const RANKS = [
  {name:"Rookie",      min:0,     max:499,    emoji:"🥉", color:"#94a3b8"},
  {name:"Scholar",     min:500,   max:1499,   emoji:"📚", color:"#60a5fa"},
  {name:"Champion",    min:1500,  max:3499,   emoji:"🏆", color:"#34d399"},
  {name:"Elite",       min:3500,  max:6999,   emoji:"⭐", color:"#fbbf24"},
  {name:"Legend",      min:7000,  max:14999,  emoji:"👑", color:"#f59e0b"},
  {name:"Mythic",      min:15000, max:Infinity,emoji:"🔱",color:"#e879f9"},
];

const BADGE_DEFS = [
  {id:"first_blood",  emoji:"🩸", name:"First Blood",    desc:"Answer your first question",       color:"#f87171"},
  {id:"streak_5",     emoji:"🔥", name:"On Fire",         desc:"5 correct in a row",                color:"#fb923c"},
  {id:"streak_10",    emoji:"💥", name:"Unstoppable",     desc:"10 correct in a row",               color:"#fbbf24"},
  {id:"perfect_game", emoji:"💎", name:"Perfect Game",    desc:"100% accuracy in a session",        color:"#60a5fa"},
  {id:"speed_demon",  emoji:"⚡", name:"Speed Demon",     desc:"Complete Rapid Fire mode",          color:"#fbbf24"},
  {id:"scholar",      emoji:"🎓", name:"True Scholar",    desc:"Complete Educational trivia",       color:"#60a5fa"},
  {id:"holy",         emoji:"✝️",  name:"The Faithful",   desc:"Complete Bible Trivia",             color:"#a78bfa"},
  {id:"gauntlet_win", emoji:"🛡️", name:"Gauntlet Knight", desc:"Survive Gauntlet mode",            color:"#fb923c"},
];

const getRank = (xp: number) => [...RANKS].reverse().find(r => xp >= r.min) || RANKS[0];
const getNextRank = (xp: number) => RANKS.find(r => r.min > xp) || null;

const MQ_ITEMS = [
  "🔥 STREAK ACTIVE","⭐ XP MULTIPLIER x2","⚔️ BATTLE MODE LIVE","🎓 LEARN & EARN","⚡ RAPID FIRE ONLINE",
  "🕵️ WHO'S THAT — GUESS NOW","🔗 CHAIN REACTION LOADED","🎭 MYSTERY BOX UNLOCKED","🛡️ GAUNTLET AWAITS","👑 REACH MYTHIC RANK",
];

const MOCK_LB = [
  {name:"GraceK",    score:12450, rank:"Mythic",   badge:"🔱"},
  {name:"BiblePro",  score:9800,  rank:"Legend",   badge:"👑"},
  {name:"GoalKing",  score:7200,  rank:"Legend",   badge:"👑"},
  {name:"QuizMaster",score:5100,  rank:"Elite",    badge:"⭐"},
  {name:"StudyBoy",  score:3800,  rank:"Elite",    badge:"⭐"},
];

const shuffle = (arr: any[]) => [...arr].sort(() => Math.random() - .5);

export default function ArcadePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { mode: urlMode } = useParams();
  const [screen,    setScreen]    = useState("home");
  const [subScreen, setSubScreen] = useState("modes"); // modes|leaderboard|badges
  const [activeMode,setActiveMode]= useState<any>(null);
  const [xp,        setXp]        = useState(0);
  const [streak,    setStreak]    = useState(0);
  const [bestStreak,setBestStreak]= useState(0);
  const [totalAns,  setTotalAns]  = useState(0);
  const [correctAns,setCorrectAns]= useState(0);
  const [badges,    setBadges]    = useState<string[]>([]);
  const [leaderboard,setLeaderboard] = useState<any[]>(MOCK_LB);
  const [ecoStats, setEcoStats] = useState<any>(null);
  const [modeStats, setModeStats] = useState<any>({});
  const [toast,     setToast]     = useState<string | null>(null);
  const [comboText, setComboText] = useState<string | null>(null);
  const [xpPop,     setXpPop]     = useState<string | null>(null);

  // Game state
  const [questions, setQuestions] = useState<any[]>([]);
  const [qIndex,    setQIndex]    = useState(0);
  const [score,     setScore]     = useState(0);
  const [selected,  setSelected]  = useState<string | null>(null);
  const [answered,  setAnswered]  = useState(false);
  const [lives,     setLives]     = useState(3);
  const [timeLeft,  setTimeLeft]  = useState(15);
  const [gameOver,  setGameOver]  = useState(false);
  const [sessionCorrect,setSessionCorrect]=useState(0);
  const [sessionTotal,  setSessionTotal]  =useState(0);

  // Who's That state
  const [cluesShown, setCluesShown] = useState(1);

  // Battle state
  const [battlePhase,  setBattlePhase]  = useState("setup"); 
  const [battleScores, setBattleScores] = useState([0,0]);
  const [battleQIdx,   setBattleQIdx]   = useState(0);
  const [currentPlayer,setCurrentPlayer]= useState(0);
  const [p1Name,       setP1Name]       = useState("Player 1");
  const [p2Name,       setP2Name]       = useState("Player 2");
  const [battleQs,     setBattleQs]     = useState<any[]>([]);

  const timerRef = useRef<any>(null);

  const rank    = getRank(xp);
  const nextRank= getNextRank(xp);
  const xpPct   = nextRank ? Math.round(((xp - rank.min) / (nextRank.min - rank.min)) * 100) : 100;

  useEffect(() => {
    // Robust mode identification from URL params or search query
    const rawMode = urlMode || searchParams.get('mode');
    if (rawMode) {
      // Handle trailing slashes or sub-paths by taking only the first part
      const modeId = rawMode.split('/')[0].toLowerCase().trim();
      console.log(`[Arcade] Identifying mode from URL: "${rawMode}" -> "${modeId}"`);
      
      const mode = MODES.find(m => m.id === modeId);
      if (mode) {
        console.log(`[Arcade] Starting game mode: ${mode.label}`);
        startGame(mode);
      } else {
        console.warn(`[Arcade] Non-existent game mode requested: "${modeId}"`);
      }
    }
  }, [searchParams, urlMode]);

  useEffect(() => {
    // Load persisted stats if any
    const stored = localStorage.getItem('arcade_stats');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.xp) setXp(data.xp);
        if (data.badges) setBadges(data.badges);
        if (data.modeStats) setModeStats(data.modeStats);
        if (data.bestStreak) setBestStreak(data.bestStreak);
      } catch (e) {
        console.error("Parse error loading arcade stats", e);
      }
    }

    // Load fresh economy stats
    fetchWithAuth('/api/games/stats')
      .then(res => res.json())
      .then(setEcoStats)
      .catch(() => {});
  }, []);

  useEffect(() => {
    localStorage.setItem('arcade_stats', JSON.stringify({ xp, badges, modeStats, bestStreak }));
  }, [xp, badges, modeStats, bestStreak]);

  useEffect(() => {
    if (subScreen === "leaderboard") {
      fetchWithAuth('/api/games/leaderboard')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) setLeaderboard(data);
        })
        .catch(() => {});
    }
  }, [subScreen]);

  useEffect(() => {
    const currentRank = getRank(xp);
    const lastRank = localStorage.getItem('arcade_last_rank');
    if (lastRank && lastRank !== currentRank.name) {
      // Rank Up!
      showToast(`🏆 RANKED UP: ${currentRank.name}!`);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: [currentRank.color, '#FFFFFF', '#FFD700']
      });
    }
    localStorage.setItem('arcade_last_rank', currentRank.name);
  }, [xp]);

  function showToast(msg: string, ms = 2000) { setToast(msg); setTimeout(() => setToast(null), ms); }
  function showCombo(txt: string) { setComboText(txt); setTimeout(() => setComboText(null), 800); }
  function showXp(amt: number) { setXpPop(`+${amt} XP`); setTimeout(() => setXpPop(null), 900); }

  const clearTimer = () => { if(timerRef.current) clearInterval(timerRef.current); };

  function startTimer(seconds: number, onExpire: () => void) {
    clearTimer();
    setTimeLeft(seconds);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearTimer(); onExpire(); return 0; }
        return t - 1;
      });
    }, 1000);
  }

  useEffect(() => () => clearTimer(), []);

  function startGame(mode: any, shouldNavigate = false) {
    if (shouldNavigate) {
      navigate(`/arcade/${mode.id}`);
    }
    clearTimer();
    setActiveMode(mode);
    setScore(0);
    setQIndex(0);
    setSelected(null);
    setAnswered(false);
    setGameOver(false);
    setSessionCorrect(0);
    setSessionTotal(0);
    setCluesShown(1);

    if (mode.type === "battle") {
      setBattlePhase("setup");
      setBattleScores([0,0]);
      setBattleQIdx(0);
      setCurrentPlayer(0);
      const qs = getUnseen([...BIBLE_Q,...FOOTBALL_Q,...EDUCATION_Q], "mixed", 10);
      setBattleQs(qs);
      setScreen("game");
      return;
    }

    if (mode.type === "gauntlet") {
      setLives(3);
      const allQ = getUnseen([...BIBLE_Q,...FOOTBALL_Q,...EDUCATION_Q,...MYSTERY_Q], "gauntlet", 15);
      setQuestions(allQ);
      setScreen("game");
      return;
    }

    let qs;
    if (mode.type === "chain")      qs = CHAIN_SETS[Math.floor(Math.random() * CHAIN_SETS.length)];
    else if (mode.type === "whos_that") qs = getUnseen(WHOS_THAT, "whos_that", 10);
    else qs = getUnseen(mode.bank || [], mode.id, 12);

    setQuestions(qs);
    setScreen("game");

    if (mode.id === "rapid") {
      startTimer(15, handleTimeout);
    }
  }

  function handleTimeout() {
    setAnswered(true);
    setStreak(0);
    setSessionTotal(t => t + 1);
    setTotalAns(t => t + 1);
    showToast("⏱️ Time's up!");
    setTimeout(() => nextQuestion(), 1500);
  }

  function awardXp(amt: number) {
    const multi = streak >= 10 ? 3 : streak >= 5 ? 2 : 1;
    const finalAmt = amt * multi;
    setXp(x => x + finalAmt);
    showXp(finalAmt);
    if (multi > 1) showCombo(`x${multi} COMBO!`);
  }

  function handleAnswer(opt: string) {
    if (answered) return;
    clearTimer();
    const q = questions[qIndex];
    const correct = opt === q.a;
    setSelected(opt);
    setAnswered(true);
    setSessionTotal(t => t + 1);
    setTotalAns(t => t + 1);

    if (correct) {
      const pts = activeMode?.id === "whos_that"
        ? Math.max(50, (q.pts || 200) - (cluesShown - 1) * 50)
        : (q.pts || 100);
      setScore(s => s + pts);
      setSessionCorrect(c => c + 1);
      setCorrectAns(c => c + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      awardXp(pts);
      
      if (newStreak === 5) showCombo("🔥 ON FIRE!");
      if (newStreak === 10) {
        showCombo("💥 UNSTOPPABLE!");
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
      }
    } else {
      setStreak(0);
      if (activeMode?.type === "gauntlet") {
        setLives(l => {
          const nl = l - 1;
          if (nl <= 0) setTimeout(() => endGame(), 1200);
          return nl;
        });
      }
    }

    setTimeout(() => nextQuestion(), correct ? 1000 : 1500);
  }

  function nextQuestion() {
    const isLast = qIndex >= questions.length - 1;
    if (isLast || (activeMode?.type === "gauntlet" && lives <= 0)) {
      endGame();
      return;
    }
    setQIndex(i => i + 1);
    setSelected(null);
    setAnswered(false);
    setCluesShown(1);
    if (activeMode?.id === "rapid") startTimer(15, handleTimeout);
  }

  async function endGame() {
    clearTimer();
    setGameOver(true);
    
    const accuracy = sessionTotal > 0 ? (sessionCorrect / sessionTotal) * 100 : 0;
    
    // RMP Integration - Award based on performance
    try {
      const response = await fetchWithAuth('/api/games/complete', {
        method: 'POST',
        body: JSON.stringify({ 
          game: `arcade_${activeMode?.id || 'unknown'}`, 
          score,
          accuracy
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.awarded) {
          showToast(`💰 +${data.amount} RMP Points!`);
          if (data.newCoins > 0) showToast(`🪙 Bonus Coins!`);
          
          // Trigger celebration
          if (accuracy > 80 || score > 1000) {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 }
            });
          }
        }
      }
    } catch (e) {
      console.error("Economy sync error:", e);
      // Fallback message but don't break the UI
      showToast("Score saved locally.");
    }

    setModeStats((prev: any) => ({
      ...prev,
      [activeMode?.id]: { 
        best: Math.max(score, prev[activeMode?.id]?.best || 0), 
        played: (prev[activeMode?.id]?.played || 0) + 1,
        lastPlayed: new Date().toISOString()
      }
    }));
    
    // Check for badges
    checkBadges(score, accuracy);
  }

  function checkBadges(score: number, accuracy: number) {
    const newBadges = [...badges];
    let changed = false;

    const addBadge = (id: string) => {
      if (!newBadges.includes(id)) {
        newBadges.push(id);
        changed = true;
        showToast(`🏆 EARNED: ${BADGE_DEFS.find(d=>d.id===id)?.name}`);
      }
    };

    addBadge("first_blood");
    if (streak >= 5) addBadge("streak_5");
    if (streak >= 10) addBadge("streak_10");
    if (accuracy >= 90 && sessionTotal >= 10) addBadge("accuracy_90");
    if (activeMode?.id === "rapid" && accuracy === 100) addBadge("rapid_fire");
    if (activeMode?.type === "gauntlet" && score > 500) addBadge("gauntlet_win");
    
    if (changed) setBadges(newBadges);
  }

  function handleBattleAnswer(opt: string) {
    if (answered) return;
    const q = battleQs[battleQIdx];
    const correct = opt === q.a;
    setSelected(opt);
    setAnswered(true);
    if (correct) {
      setBattleScores(s => { const ns=[...s]; ns[currentPlayer]+=q.pts||100; return ns; });
    }
    setTimeout(() => {
      if (battleQIdx >= battleQs.length - 1) {
        setBattlePhase("result");
        return;
      }
      setBattleQIdx(i => i + 1);
      setCurrentPlayer(p => 1 - p);
      setSelected(null);
      setAnswered(false);
    }, 1200);
  }

  return (
    <div className="min-h-screen bg-[#080810] text-[#f0f0ff] font-sans pb-24 overflow-x-hidden">
      {/* Marquee */}
      <div className="bg-[#0f0f1a] border-b border-white/5 py-2 overflow-hidden whitespace-nowrap sticky top-0 z-50 backdrop-blur-xl">
        <motion.div 
          animate={{ x: [0, -1000] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="inline-flex gap-8 px-8"
        >
          {[...MQ_ITEMS, ...MQ_ITEMS].map((item, index) => (
            <span key={`arc-mq-${index}`} className="inline-flex items-center gap-2 text-[10px] font-mono tracking-widest text-[#44445a]">
              <div className="w-1 h-1 bg-[#a78bfa] rounded-full" />
              {item}
            </span>
          ))}
        </motion.div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-8">
        {screen === "home" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-center mb-8">
              <h1 className="font-bebas text-6xl md:text-8xl tracking-widest leading-none bg-gradient-to-br from-white via-[#a78bfa] to-[#60a5fa] bg-clip-text text-transparent italic">
                ARCADE
              </h1>
              <p className="font-mono text-[10px] tracking-[4px] text-[#44445a] uppercase mt-2">
                Trivia Arena • RMP Rewards • Ranks
              </p>
            </div>

            {/* XP Bar */}
            <div className="bg-[#0f0f1a] border border-white/5 rounded-2xl p-4 mb-6 relative overflow-hidden group">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{rank.emoji}</span>
                  <div>
                    <div className="font-bebas text-xl tracking-widest" style={{ color: rank.color }}>{rank.name}</div>
                    {nextRank && <div className="text-[10px] text-[#44445a] font-mono">→ {nextRank.name} IN {nextRank.min - xp} XP</div>}
                  </div>
                </div>
                <div className="font-mono text-sm text-[#a78bfa]">{xp.toLocaleString()} XP</div>
              </div>
              <div className="h-1.5 bg-[#161628] rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPct}%` }}
                  className="h-full bg-gradient-to-r from-[#a78bfa] to-[#60a5fa]" 
                />
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4">
                {[
                  { n: totalAns, l: "GAMES", i: <Gamepad2 size={12} /> },
                  { n: `${totalAns > 0 ? Math.round(correctAns / totalAns * 100) : 0}%`, l: "ACCURACY", i: <Target size={12} /> },
                  { n: ecoStats?.rmpBalance || 0, l: "POINTS", i: <Coins size={12} /> },
                ].map((stat, i) => (
                  <div key={`arcade-stat-${i}`} className="bg-[#161628] border border-white/5 rounded-xl p-2 text-center">
                    <div className="font-bebas text-2xl leading-none text-white">{stat.n}</div>
                    <div className="text-[9px] text-[#44445a] font-mono tracking-widest mt-1 flex items-center justify-center gap-1">
                      {stat.i} {stat.l}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sub Nav */}
            <div className="flex gap-2 mb-6">
              {[
                { id: "modes", lbl: "PLAY", icon: <Zap size={14} /> },
                { id: "leaderboard", lbl: "RANKS", icon: <Trophy size={14} /> },
                { id: "badges", lbl: "BADGES", icon: <Medal size={14} /> },
                { id: "store", lbl: "STORE", icon: <Star size={14} /> },
              ].map(n => (
                <button
                  key={n.id}
                  onClick={() => setSubScreen(n.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border font-mono text-[11px] tracking-wider transition-all",
                    subScreen === n.id ? "bg-[#a78bfa]/10 border-[#a78bfa] text-[#a78bfa]" : "bg-[#0f0f1a] border-white/5 text-[#44445a]"
                  )}
                >
                  {n.icon} {n.lbl}
                </button>
              ))}
            </div>

            {/* Content based on sub-screen */}
            {subScreen === "modes" && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {MODES.map(m => (
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    key={m.id}
                    onClick={() => startGame(m, true)}
                    className="bg-[#0f0f1a] border border-white/5 rounded-2xl p-4 text-center group transition-all hover:border-[#a78bfa]/30"
                  >
                    <span className="text-3xl block mb-2">{m.emoji}</span>
                    <span className="font-bebas text-sm tracking-widest text-white block mb-1">{m.label}</span>
                    <span className="text-[9px] text-[#44445a] font-medium leading-tight block">{m.desc}</span>
                  </motion.button>
                ))}
              </div>
            )}

            {subScreen === "leaderboard" && (
              <div className="space-y-2">
                {[
                  { name: "YOU", score: xp, isMe: true },
                  ...leaderboard.filter(l => l.name !== "YOU").map(l => ({ ...l, isMe: false }))
                ].sort((a, b) => b.score - a.score).map((p, i) => (
                  <div key={`arcade-lb-${p.name}-${i}`} className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl border transition-all",
                    p.isMe ? "bg-[#a78bfa]/5 border-[#a78bfa]" : "bg-[#0f0f1a] border-white/5"
                  )}>
                    <div className="font-bebas text-2xl w-8 text-center text-[#44445a]">{i + 1}</div>
                    <div className="flex-1 font-bold">{p.name}</div>
                    <div className="font-mono text-[#f59e0b] text-sm">{p.score.toLocaleString()} XP</div>
                  </div>
                ))}
              </div>
            )}

            {subScreen === "badges" && (
              <div className="grid grid-cols-3 gap-3">
                {BADGE_DEFS.map(b => {
                  const earned = badges.includes(b.id);
                  return (
                    <div key={b.id} className={cn(
                      "bg-[#0f0f1a] border rounded-2xl p-4 text-center transition-all",
                      earned ? "border-[#a78bfa]/50 opacity-100" : "border-white/5 opacity-50 grayscale"
                    )}>
                      <span className="text-3xl block mb-1">{b.emoji}</span>
                      <div className="font-bold text-[10px] leading-tight">{b.name}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {subScreen === "store" && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-yellow-900/50 to-amber-900/50 border border-yellow-500/30 rounded-2xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 bg-yellow-500 text-black font-bebas text-xs tracking-widest">PREMIUM</div>
                  <h3 className="font-bebas text-2xl tracking-widest text-white mb-1">ARENA PLUS+</h3>
                  <p className="text-gray-400 text-[10px] uppercase font-mono tracking-widest mb-4">No Ads • Triple XP • Gold Name</p>
                  <button className="w-full py-3 bg-yellow-500 text-black font-bebas text-xl tracking-widest rounded-xl hover:scale-[1.02] transition-transform">
                    UPGRADE NOW — $4.99
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#0f0f1a] border border-white/5 rounded-2xl p-4 text-center group transition-all hover:border-[#a78bfa]/30">
                    <div className="text-3xl mb-2">🎬</div>
                    <div className="font-bebas text-sm tracking-widest text-white block mb-1">Hollywood DLC</div>
                    <div className="text-[9px] text-[#44445a] font-medium leading-tight block mb-4">500+ Celebrity Qs</div>
                    <button className="w-full py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono tracking-widest uppercase hover:bg-white/10 transition-colors">
                      $1.99
                    </button>
                  </div>
                  <div className="bg-[#0f0f1a] border border-white/5 rounded-2xl p-4 text-center group transition-all hover:border-[#a78bfa]/30">
                    <div className="text-3xl mb-2">🎮</div>
                    <div className="font-bebas text-sm tracking-widest text-white block mb-1">Gaming Pack</div>
                    <div className="text-[9px] text-[#44445a] font-medium leading-tight block mb-4">1000+ ESPORTS Qs</div>
                    <button className="w-full py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono tracking-widest uppercase hover:bg-white/10 transition-colors">
                      $2.99
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {screen === "game" && (
          <div className="space-y-6">
            {!gameOver ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex justify-between items-center mb-8">
                  <button 
                    onClick={() => {
                      setScreen("home");
                      navigate("/arcade");
                    }} 
                    className="p-2 bg-[#0f0f1a] border border-white/5 rounded-xl text-[#8888aa]"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div className="text-center">
                    <h2 className="font-bebas text-2xl tracking-widest">{activeMode?.label}</h2>
                    <div className="text-[10px] font-mono text-[#a78bfa] tracking-[2px]">LEVEL {qIndex + 1}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bebas text-3xl text-[#f59e0b] leading-none">{score}</div>
                    <div className="text-[9px] font-mono text-[#44445a] tracking-widest">SCORE</div>
                  </div>
                </div>

                {activeMode?.type === "battle" ? (
                  battlePhase === "setup" ? (
                    <div className="bg-[#0f0f1a] border border-white/5 rounded-3xl p-8 text-center space-y-6">
                      <div className="flex justify-center -space-x-4">
                        <div className="w-16 h-16 rounded-full bg-[#f87171] border-4 border-[#080810] flex items-center justify-center font-bebas text-2xl">P1</div>
                        <div className="w-16 h-16 rounded-full bg-[#60a5fa] border-4 border-[#080810] flex items-center justify-center font-bebas text-2xl">P2</div>
                      </div>
                      <h3 className="font-bebas text-3xl tracking-widest italic">1v1 BATTLE</h3>
                      <button 
                        onClick={() => setBattlePhase("p1")}
                        className="w-full py-4 bg-gradient-to-r from-[#a78bfa] to-[#60a5fa] rounded-2xl font-bebas text-2xl tracking-widest text-[#080810]"
                      >
                        ENTER ARENA
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between font-bebas text-xl tracking-widest mb-2 px-2">
                        <span className={cn(currentPlayer === 0 ? "text-[#f87171]" : "text-[#44445a]")}>P1: {battleScores[0]}</span>
                        <span className={cn(currentPlayer === 1 ? "text-[#60a5fa]" : "text-[#44445a]")}>P2: {battleScores[1]}</span>
                      </div>
                      <div className="bg-[#0f0f1a] border border-white/5 rounded-3xl p-6 relative overflow-hidden">
                        <div className="text-[10px] font-mono text-[#a78bfa] mb-4 flex items-center gap-2">
                          <span className={cn("inline-block w-1.5 h-1.5 rounded-full animate-pulse", currentPlayer === 0 ? "bg-[#f87171]" : "bg-[#60a5fa]")} />
                          {currentPlayer === 0 ? "PLAYER 1" : "PLAYER 2"}'S TURN
                        </div>
                        <p className="text-xl font-bold leading-relaxed mb-8">{battleQs[battleQIdx]?.q}</p>
                        <div className="grid grid-cols-1 gap-3">
                          {battleQs[battleQIdx]?.opts.map((opt: string, i: number) => (
                            <button
                              key={`battle-opt-${i}`}
                              disabled={answered}
                              onClick={() => handleBattleAnswer(opt)}
                              className={cn(
                                "w-full py-4 px-6 rounded-2xl border text-left font-bold transition-all",
                                !answered && "bg-[#161628] border-white/5 hover:border-[#a78bfa]/30",
                                answered && opt === battleQs[battleQIdx].a && "bg-[#34d399]/10 border-[#34d399] text-[#34d399]",
                                answered && opt === selected && opt !== battleQs[battleQIdx].a && "bg-[#f87171]/10 border-[#f87171] text-[#f87171]",
                                answered && opt !== battleQs[battleQIdx].a && opt !== selected && "bg-[#161628] border-white/5 opacity-40"
                              )}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="space-y-4">
                    <div className="bg-[#0f0f1a] border border-white/5 rounded-3xl p-6 relative overflow-hidden">
                      <div className="flex justify-between items-center mb-6">
                        <div className="text-[10px] font-mono text-[#44445a] tracking-widest uppercase">
                          Question {qIndex + 1} / {questions.length}
                        </div>
                        {activeMode?.id === "rapid" && (
                          <div className={cn("font-mono text-sm", timeLeft < 5 ? "text-red-500 animate-pulse" : "text-[#a78bfa]")}>
                            {timeLeft}s
                          </div>
                        )}
                      </div>
                      
                      <p className="text-xl font-bold leading-relaxed mb-8">{questions[qIndex]?.q}</p>

                      <div className="grid grid-cols-1 gap-3">
                        {questions[qIndex]?.opts.map((opt: string, i: number) => (
                          <button
                            key={`qa-opt-${i}`}
                            disabled={answered}
                            onClick={() => handleAnswer(opt)}
                            className={cn(
                              "w-full py-4 px-6 rounded-2xl border text-left font-bold transition-all",
                              !answered && "bg-[#161628] border-white/5 hover:border-[#a78bfa]/30",
                              answered && opt === questions[qIndex].a && "bg-[#34d399]/10 border-[#34d399] text-[#34d399]",
                              answered && opt === selected && opt !== questions[qIndex].a && "bg-[#f87171]/10 border-[#f87171] text-[#f87171]",
                              answered && opt !== questions[qIndex].a && opt !== selected && "bg-[#161628] border-white/5 opacity-40"
                            )}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                      
                      {activeMode?.type === "gauntlet" && (
                        <div className="flex gap-2 mt-6 justify-center">
                          {[0, 1, 2].map(i => (
                            <Heart key={`arc-heart-${i}`} size={16} fill={i < lives ? "#f87171" : "transparent"} stroke={i < lives ? "#f87171" : "#44445a"} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#0f0f1a] border border-white/5 rounded-3xl p-8 text-center">
                <div className="text-6xl mb-4">🏁</div>
                <h2 className="font-bebas text-4xl tracking-widest mb-2 italic">ARENA CONQUERED</h2>
                <p className="text-[#8888aa] text-sm mb-8">Performance metrics uploaded to neural link.</p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-[#161628] rounded-2xl p-4">
                    <div className="font-bebas text-4xl text-[#f59e0b]">{score}</div>
                    <div className="text-[10px] font-mono text-[#44445a] tracking-widest mt-1">TOTAL SCORE</div>
                  </div>
                  <div className="bg-[#161628] rounded-2xl p-4">
                    <div className="font-bebas text-4xl text-[#34d399]">{sessionCorrect}/{sessionTotal}</div>
                    <div className="text-[10px] font-mono text-[#44445a] tracking-widest mt-1">ACCURACY</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-3">
                    <button 
                      onClick={() => startGame(activeMode)}
                      className="w-full py-4 bg-[#a78bfa] rounded-2xl font-bebas text-xl tracking-widest text-[#080810] hover:scale-[1.02] active:scale-[0.98] transition-transform"
                    >
                      READY FOR REMATCH
                    </button>
                    <button 
                      onClick={() => {
                        setScreen("home");
                        navigate("/arcade");
                      }}
                      className="w-full py-4 bg-[#161628] border border-white/5 rounded-2xl font-bebas text-xl tracking-widest text-white hover:bg-[#1f1f3a] transition-colors"
                    >
                      RETURN TO HUB
                    </button>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <ShareInvite 
                      title="INVITE CHALLENGERS"
                      url={`/arcade`}
                      text={`⚽ I scored ${score} in ${activeMode?.label}… can you beat me? 😈`}
                      className="bg-transparent border-none p-0"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Floating Effects */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#a78bfa] text-[#080810] px-6 py-2 rounded-full font-mono text-xs font-bold z-[100] shadow-[0_0_20px_rgba(167,139,250,0.4)]"
          >
            {toast}
          </motion.div>
        )}
        {comboText && (
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center pointer-events-none z-[101]"
          >
            <div className="font-bebas text-6xl text-[#f59e0b] italic drop-shadow-[0_0_30px_rgba(245,158,11,0.8)]">
              {comboText}
            </div>
          </motion.div>
        )}
        {xpPop && (
          <motion.div 
            initial={{ y: 0, opacity: 1 }}
            animate={{ y: -100, opacity: 0 }}
            className="fixed left-1/2 bottom-1/2 -translate-x-1/2 font-bebas text-4xl text-[#a78bfa] pointer-events-none z-[102]"
          >
            {xpPop}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
