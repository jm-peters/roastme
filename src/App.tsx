import { useState, useRef, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { auth, db } from './firebase';
import { OnboardingSplash } from "./components/OnboardingSplash";
import { 
  Flame, 
  Zap, 
  Share2, 
  Twitter, 
  Instagram, 
  Copy, 
  RefreshCw, 
  Camera,
  ArrowRight,
  TrendingUp,
  Award,
  Skull,
  X,
  Swords
} from "lucide-react";
import Markdown from "react-markdown";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";

import { useTimeTracking } from "./hooks/useTimeTracking";
import DailyLoginClaim from "./components/DailyLoginClaim";
import EarningsDashboard from "./components/EarningsDashboard";

import RoastResultCard from "./components/RoastResultCard";
import UserRoastStats from "./components/UserRoastStats";
import { getCurrentTheme } from "./services/automationService";
import RoastPage from "./pages/RoastPage";
import AboutPage from "./pages/AboutPage";
import HowItWorksPage from "./pages/HowItWorksPage";
import FAQPage from "./pages/FAQPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import ContactPage from "./pages/ContactPage";
import MarqueeHeader from "./components/MarqueeHeader";
import TopRoasterLeaderboard from "./components/TopRoasterLeaderboard";
import UsernameSetup from "./components/UsernameSetup";
import RoastboardPage from "./pages/RoastboardPage";
import CoinsDisplay from "./components/CoinsDisplay";
import DirectRoast from "./components/DirectRoast";
import MonthlyChallenge from "./components/MonthlyChallenge";
import ChallengePage from "./pages/ChallengePage";
import FeedPage from "./pages/FeedPage";
import BattlePage from "./pages/BattlePage";
import DuoBattlePage from "./pages/DuoBattlePage";
import TrendingPage from "./pages/TrendingPage";
import RemixPage from "./pages/RemixPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import CookiePolicyPage from "./pages/CookiePolicyPage";
import AnonymousPage from "./pages/AnonymousPage";
import AnonymousSendPage from "./pages/AnonymousSendPage";
import FriendshipPage from "./pages/FriendshipPage";
import AcceptFriendshipChallenge from "./pages/friendship/AcceptChallenge";
import TruthOrDarePage from "./pages/TruthOrDarePage";
import ChallengeWallPage from "./pages/ChallengeWallPage";
import DareRoomPage from "./pages/truthordare/DareRoomPage";
import AcceptTruthOrDare from "./pages/truthordare/AcceptChallenge";
import DailyQuests from "./components/DailyQuests";
import StreakVisual from "./components/StreakVisual";
import { DailySpin } from "./components/DailySpin";
import TruthOrDareInvite from "./pages/truthordare/InvitePage";
import TruthOrDareOpenChallenge from "./pages/truthordare/OpenChallenge";
import InboxPage from "./pages/truthordare/InboxPage";
import FriendshipResultsPage from './pages/friendship/FriendshipResultsPage';
import InviteBattlePage from './pages/truthordare/InviteBattlePage';
import PrankPage from "./pages/PrankPage";
import PrankExecutionPage from "./pages/PrankExecutionPage";
import CookieConsent from "./components/CookieConsent";
import { ToastProvider } from "./components/Toast";
import GamesHub from "./pages/games/GamesHub";
import WordGame from "./pages/games/WordGame";
import TriviaGame from "./pages/games/TriviaGame";
import MemoryMatch from "./pages/games/MemoryMatch";
import TypingRace from "./pages/games/TypingRace";
import RiddleGame from "./pages/games/RiddleGame";
import BibleTrivia from "./pages/games/BibleTrivia";
import EducationalTrivia from "./pages/games/EducationalTrivia";
import FootballTrivia from "./pages/games/FootballTrivia";
import DailyChallenge from "./pages/games/DailyChallenge";
import FamilyMode from "./pages/games/FamilyMode";
import QuickBattlePage from "./pages/games/QuickBattlePage";
import GauntletPage from "./pages/games/GauntletPage";
import ArcadePage from "./pages/games/ArcadePage";

import RoastSessionV2 from "./pages/roast/RoastSessionV2";
import RoastHistory from "./pages/roast/RoastHistory";
import DailyRoast from "./pages/roast/DailyRoast";
import RoastBattle from "./pages/roast/RoastBattle";
import RoastProfile from "./pages/roast/RoastProfile";

import Footer from "./components/Footer";
import Navigation from "./components/Navigation";
import AdBanner from "./components/AdBanner";

import TruthOrDareInbox from "./components/TruthOrDareInbox";
import SettingsModal from "./components/SettingsModal";
import ProfilePage from "./pages/ProfilePage";

import { optimizeImage } from "./utils/imageOptimizer";
import { fetchWithAuth, retryWithBackoff } from "./utils/apiUtils";
import StatsCard from "./components/StatsCard";
import ScrollToTop from "./components/ScrollToTop";
import { soundManager } from "./utils/soundManager";

// Analytics tracking component
function AnalyticsTracker() {
  const [searchParams] = useSearchParams();
  const location = useLocation();

  useEffect(() => {
    // Handle referral codes globally
    const ref = searchParams.get('ref');
    if (ref) {
      localStorage.setItem('referralCode_pending', ref);
    }

    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('config', 'G-DGNSZM2D4W', {
        page_path: location.pathname + location.search,
      });
    }
  }, [location, searchParams]);

  return null;
}

// User activity tracking component
function UserTracker() {
  const location = useLocation();
  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');

  useEffect(() => {
    if (userId) {
      const track = () => {
        fetch('/api/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            isAuthenticated: !!username,
            path: location.pathname,
            userAgent: navigator.userAgent,
            ip: 'client-side' // Server will detect actual IP
          })
        }).catch(() => {});
      };

      track();

      // Time spent tracking (every 60s)
      const interval = setInterval(async () => {
        retryWithBackoff(() => fetch('/api/activity/ping', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId })
        })).catch(() => {});
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [location, userId, username]);

  return null;
}

type Mode = "roast" | "hype";

function Home({ 
  userId, 
  username, 
  userRMP, 
  showUsernameSetup, 
  setShowUsernameSetup 
}: { 
  userId: string; 
  username: string; 
  userRMP: string; 
  showUsernameSetup: boolean; 
  setShowUsernameSetup: (show: boolean) => void;
}) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>("roast");
  const [input, setInput] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [history, setHistory] = useState<{ mode: Mode; text: string; id: string }[]>([]);
  const [currentRoastId, setCurrentRoastId] = useState("");
  const [roastAuthor, setRoastAuthor] = useState<string | null>(null);
  const [isAnonymousView, setIsAnonymousView] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showDirectRoastModal, setShowDirectRoastModal] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);
  const [generatedRoast, setGeneratedRoast] = useState<any>(null);
  
  const currentTheme = getCurrentTheme();

  useEffect(() => {
    if (username) {
      fetch(`/api/users/${username}`)
        .then(res => res.json())
        .then(data => {
          if (data.avatarUrl) {
            setAvatarUrl(data.avatarUrl);
          }
        })
        .catch(console.error);
    }
  }, [username]);

  const [targetUser, setTargetUser] = useState<{ username: string; id: string } | null>(null);
  
  useEffect(() => {
    const roastId = searchParams.get('roastId');
    const anon = searchParams.get('anon') === 'true';
    setIsAnonymousView(anon);

    if (roastId) {
      retryWithBackoff(() => fetch(`/api/roasts/${roastId}`))
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            setResult(data.text);
            setCurrentRoastId(data.id);
            setPhotoUrl(data.photoUrl);
            setMode(data.mode || 'roast');
            setRoastAuthor(data.username || 'anonymous');
            
            // Track view
            retryWithBackoff(() => fetch(`/api/referrals/activity-click`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ roastId: data.id, referrerId: 'direct' })
            })).catch(console.error);
          }
        })
        .catch(console.error);
    }
  }, [searchParams]);
  
  useEffect(() => {
    const roastTarget = searchParams.get('roast');
    if (roastTarget) {
      const targetUsername = localStorage.getItem('roastTarget');
      const targetId = localStorage.getItem('roastTargetId');
      if (targetUsername === roastTarget && targetId) {
        setTargetUser({ username: targetUsername, id: targetId });
      }
    }
  }, [searchParams]);

  useEffect(() => {
    localStorage.setItem("userId", userId);
  }, [userId]);

  useEffect(() => {
    // Track referral if present
    const ref = searchParams.get('ref');
    if (ref && ref !== userId) {
      localStorage.setItem('referrerId', ref);
      // We'll track the click when they actually interact or just on load
      console.log(`Referred by: ${ref}`);
    }
  }, [userId, searchParams]);

  const resultRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const resultCardRef = useRef<HTMLDivElement>(null);

  const generateContent = async () => {
    if (!input.trim() && !photoUrl) {
      soundManager.onUserMistake('wrong_input');
      return;
    }
    
    setLoading(true);
    setGeneratedRoast(null);
    setResult(null);
    soundManager.playFaaah('soft');

    try {
      console.log("[GENERATION] Starting roast generation via server API...");

      const response = await fetch('/api/generate-roast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: input || 'someone',
          photo: photoUrl || "",
          mode,
          userId,
          publishToFeed: true,
          shareAnonymously: false
        }),
      });

      // First get the text to log it if it's not JSON
      const responseText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch (err) {
        console.error("Non-JSON Response received:", response.status, responseText.substring(0, 200));
        throw new Error(`Server returned non-JSON response (${response.status})`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate roast');
      }

      console.log("[GENERATION] Server Success!");
      
      const { roast } = data;
      
      setGeneratedRoast(roast);
      setResult(roast.text); // Keep legacy state for now just in case
      setCurrentRoastId(roast.id);
      
      setHistory(prev => [{ mode, text: roast.text, id: roast.id }, ...prev].slice(0, 5));
      setGenerationCount(prev => prev + 1);

      // Scroll to result after a short delay to allow rendering
      setTimeout(() => {
        resultCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      
      soundManager.onRoastGenerated();

      if (mode === "hype") {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00FF00', '#FFFFFF', '#FFD700']
        });
      }
    } catch (error: any) {
      console.error("Generation error:", error);
      setResult(error.message || "The system is too scared to roast this. (Error occurred)");
      soundManager.onUserMistake('repeated_fail');
    } finally {
      setLoading(false);
    }
  };

  const shareToTwitter = () => {
    if (!result) return;
    const text = encodeURIComponent(`${result}\n\nChallenge me back: ${window.location.origin}/roast/${currentRoastId}?ref=${userId}\n\n#ROASTME 🔥`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(`${result}\n\nRoast me back: ${window.location.origin}/roast/${currentRoastId}?ref=${userId}\n\nGenerated by ROASTME 🔥`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const optimized = await optimizeImage(file);
        setPhotoUrl(optimized);
      } catch (err) {
        console.error("Image optimization failed:", err);
        // Fallback to original if optimization fails
        const reader = new FileReader();
        reader.onloadend = () => setPhotoUrl(reader.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  return (
    <div className="flex flex-col items-center">
      <main className="max-w-3xl w-full px-6 py-4 flex flex-col gap-6">
        {targetUser && (
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-red-600/20 border-2 border-red-500 p-4 text-center relative"
          >
            <p className="text-red-400 font-display text-lg uppercase tracking-widest">
              🎯 TARGET ACQUIRED: <span className="text-white">@{targetUser.username}</span>
            </p>
            <button 
              onClick={() => {
                setTargetUser(null);
                setSearchParams({});
                localStorage.removeItem('roastTarget');
                localStorage.removeItem('roastTargetId');
              }}
              className="absolute top-2 right-2 text-red-500 hover:text-white"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}

        {/* Hero Section */}
        <section className="text-center space-y-2 flex flex-col items-center">
          <p className="sr-only">Impact-Site-Verification: 41a23fa4-8d29-448d-9800-e7ca92b47ab1</p>
          <motion.h1 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-4xl md:text-6xl leading-none"
          >
            ROAST<span className="text-neon-green">ME</span>
          </motion.h1>
          <p className="text-gallery-white/60 font-mono text-sm uppercase tracking-widest mb-4">
            The Internet's Most Crucial and Loved Entertainment Engine
          </p>
          
          <div className="flex flex-wrap justify-center gap-3 my-4">
            <Link to="/roast-v2" className="bg-[#dc2626] text-white px-6 py-2 rounded-full font-bold italic tracking-wider flex items-center gap-2 hover:scale-105 transition">
              🔥 NEW: ROAST V2
            </Link>
            <Link to="/roast-history" className="bg-white/10 text-white px-4 py-2 rounded-full font-bold text-sm hover:scale-105 transition">
              🏆 History
            </Link>
            <Link to="/roast-profile" className="bg-white/10 text-white px-4 py-2 rounded-full font-bold text-sm hover:scale-105 transition">
              👤 Profile
            </Link>
            <Link to="/daily-roast" className="bg-white/10 text-white px-4 py-2 rounded-full font-bold text-sm hover:scale-105 transition">
              💌 Daily
            </Link>
            <Link to="/roast-battle" className="bg-[#fbbf24] text-black px-4 py-2 rounded-full font-bold text-sm hover:scale-105 transition">
              ⚔️ Battles
            </Link>
          </div>

          {userId && <StreakVisual />}
        </section>

        {userId && <DailySpin />}
        {userId && <DailyQuests />}

        {/* Mode Toggle */}
        <div className="flex justify-center gap-4">
          <button 
            onClick={() => setMode("roast")}
            className={cn(
              "brutal-btn flex items-center gap-2",
              mode === "roast" ? "bg-neon-green" : "bg-gallery-white/10 text-gallery-white"
            )}
          >
            <Flame size={20} /> ROAST
          </button>
          <button 
            onClick={() => setMode("hype")}
            className={cn(
              "brutal-btn flex items-center gap-2",
              mode === "hype" ? "bg-neon-green" : "bg-gallery-white/10 text-gallery-white"
            )}
          >
            <Zap size={20} /> HYPE
          </button>
        </div>

        {/* Input Area */}
        <div className="space-y-4">
          <div className="relative group">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === "roast" ? "Who are we destroying today? (e.g. 'My friend Dave who thinks he can rap')" : "Who needs an ego boost? (e.g. 'Me after finishing my first React app')"}
              className="w-full h-40 bg-transparent brutal-border p-6 font-mono text-lg focus:outline-none focus:ring-2 focus:ring-neon-green transition-all placeholder:text-gallery-white/20"
            />
            <div className="absolute bottom-4 right-4 flex items-center gap-4">
              <label className="cursor-pointer text-gallery-white/20 hover:text-neon-green transition-colors">
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                <div className="flex items-center gap-1 font-mono text-xs">
                  <Camera size={16} /> <span>(+) PHOTO</span>
                </div>
              </label>
              <div className="text-gallery-white/20 font-mono text-xs">
                {input.length} CHARS
              </div>
            </div>
          </div>

          {photoUrl && photoUrl.trim() !== "" && (
            <div className="relative w-32 h-32 brutal-border overflow-hidden group">
              <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
              <button 
                onClick={(e) => { e.preventDefault(); setPhotoUrl(null); }}
                className="absolute top-2 right-2 bg-brutal-black text-white p-1 rounded-full hover:bg-red-500 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {mode === 'roast' && (
            <div className="flex items-center justify-between p-3 brutal-border bg-gallery-white/5 mt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-gallery-white/60">THIS WEEK'S THEME:</span>
                <span className="bg-purple-600 text-white font-bold px-3 py-1 text-sm rounded shadow-[4px_4px_0_rgba(168,85,247,0.3)]">
                  {currentTheme.icon} {currentTheme.name}
                </span>
              </div>
              <div className="text-[10px] text-gray-400 font-mono">
                CHANGES IN {currentTheme.daysLeft}d
              </div>
            </div>
          )}

          <button 
            onClick={generateContent}
            disabled={loading || (!input.trim() && !photoUrl)}
            className="w-full brutal-btn text-2xl py-6 flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <RefreshCw className="animate-spin" />
            ) : (
              <>
                {mode === "roast" ? "CREATE ROAST" : "CREATE HYPE"} <ArrowRight />
              </>
            )}
          </button>

          {/* Result Area */}
          <AnimatePresence mode="wait">
            {generatedRoast && (
              <div ref={resultCardRef}>
                <RoastResultCard 
                  roast={{
                    ...generatedRoast,
                    isTrending: true
                  }}
                  mode={mode}
                />
              </div>
            )}
            {!generatedRoast && result && (
              <div ref={resultCardRef} className="brutal-border p-6 bg-red-500/10 text-red-500 font-mono text-center">
                <Markdown>{result}</Markdown>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Recent Activity */}
        {history.length > 0 && (
          <section className="space-y-6">
            <h2 className="text-3xl">RECENT FIRE</h2>
            <div className="space-y-4">
              {Array.isArray(history) && history.map((item, index) => (
                <Link key={`history-entry-${item.id}-${index}`} to={`/roast/${item.id}`} className="block">
                  <div className="brutal-border p-4 bg-gallery-white/5 text-sm font-mono flex justify-between items-center gap-4 hover:bg-gallery-white/10 transition-colors">
                    <span className="truncate opacity-70 italic">"{item.text.substring(0, 60)}..."</span>
                    <span className={cn(
                      "px-2 py-1 text-[10px] uppercase font-bold",
                      item.mode === "roast" ? "bg-red-500 text-white" : "bg-neon-green text-brutal-black"
                    )}>
                      {item.mode}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Event & Stats at the bottom */}
        <UserRoastStats />
        <MonthlyChallenge />
        <StatsCard />
      </main>

      {showDirectRoastModal && (
        <DirectRoast 
          isModal={true} 
          onClose={() => setShowDirectRoastModal(false)} 
        />
      )}
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [userId, setUserId] = useState(() => {
    let id = localStorage.getItem("userId");
    if (!id) {
      id = 'guest_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem("userId", id);
    }
    return id;
  });
  const [username, setUsername] = useState(() => localStorage.getItem("username") || "");
  const [userRMP, setUserRMP] = useState(() => localStorage.getItem("userRMP") || "0");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showUsernameSetup, setShowUsernameSetup] = useState(false);
  const [isAuthReady] = useState(true);

  useTimeTracking();

  // Consolidate auth modal triggering
  useEffect(() => {
    const setup = searchParams.get('setup');
    if ((setup === 'true' || location.pathname === '/settings/roastboard' || location.pathname === '/settings/username' || location.pathname === '/auth') && !username) {
      setShowUsernameSetup(true);
      // Clean up the URL if it's a temp param
      if (setup === 'true') {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('setup');
        const newSearch = newParams.toString();
        navigate(location.pathname + (newSearch ? '?' + newSearch : ''), { replace: true });
      }
    }
  }, [username, location.pathname, searchParams, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('roasterUsername');
    localStorage.removeItem('username');
    setUsername("");
    setAvatarUrl(null);
  };

  const handleDeleteAccount = () => {
    localStorage.clear();
    navigate('/');
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-brutal-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-neon-green border-t-transparent animate-spin rounded-full shadow-[0_0_20px_rgba(57,255,20,0.2)]" />
      </div>
    );
  }

  return (
    <>
      <ScrollToTop />
      <ToastProvider>
        <div className="min-h-screen flex flex-col bg-brutal-black text-gallery-white font-sans selection:bg-neon-green selection:text-brutal-black">
          <Navigation 
            username={username} 
            avatarUrl={avatarUrl} 
            setShowUsernameSetup={setShowUsernameSetup} 
            onLogout={handleLogout}
            onDeleteAccount={handleDeleteAccount}
          />
          <MarqueeHeader />
          <AnalyticsTracker />
          <UserTracker />
          
          <main className="flex-1 w-full">
            <Routes>
              <Route path="/" element={<RoastSessionV2 />} />
              <Route path="/roast-v1" element={
                <Home 
                  userId={userId} 
                  username={username} 
                  userRMP={userRMP} 
                  showUsernameSetup={showUsernameSetup}
                  setShowUsernameSetup={setShowUsernameSetup}
                />
              } />
              <Route path="/profile/:username" element={<ProfilePage />} />
              <Route path="/feed" element={<FeedPage />} />
              <Route path="/battle" element={<BattlePage />} />
              <Route path="/battle/:id" element={<DuoBattlePage />} />
              <Route path="/trending" element={<TrendingPage />} />
              <Route path="/remix/:id" element={<RemixPage />} />
              <Route path="/roast/:id" element={<RoastPage />} />
              <Route path="/challenge/:id" element={<ChallengePage />} />
              <Route path="/@:username" element={<RoastboardPage />} />
              <Route path="/anonymous" element={<AnonymousPage />} />
              <Route path="/anonymous/send/:code" element={<AnonymousSendPage />} />
              <Route path="/friendship" element={<FriendshipPage />} />
              <Route path="/friendship/accept/:code" element={<AcceptFriendshipChallenge />} />
              <Route path="/friendship/results/:id" element={<FriendshipResultsPage />} />
              <Route path="/tod/:username/:code" element={<InviteBattlePage />} />
              <Route path="/friendship/:challengeId" element={<FriendshipPage />} />
              <Route path="/truthordare" element={<TruthOrDarePage />} />
              <Route path="/challenge-wall" element={<ChallengeWallPage />} />
              <Route path="/truthordare/room/:code" element={<DareRoomPage />} />
              <Route path="/truthordare/inbox" element={<InboxPage />} />
              <Route path="/truthordare/:id" element={<AcceptTruthOrDare />} />
              <Route path="/tod/:username/challenge" element={<TruthOrDareOpenChallenge />} />
              <Route path="/truthordare/invite/:code" element={<TruthOrDareInvite />} />
              <Route path="/prank" element={<PrankPage />} />
              <Route path="/prank/:id" element={<PrankExecutionPage />} />
              <Route path="/games" element={<GamesHub />} />
              <Route path="/games/word" element={<WordGame />} />
              <Route path="/games/trivia" element={<TriviaGame />} />
              <Route path="/games/memory" element={<MemoryMatch />} />
              <Route path="/games/typing" element={<TypingRace />} />
              <Route path="/games/riddle" element={<RiddleGame />} />
              <Route path="/games/bible-trivia" element={<BibleTrivia />} />
              <Route path="/games/educational-trivia" element={<EducationalTrivia />} />
              <Route path="/games/football-trivia" element={<FootballTrivia />} />
              <Route path="/games/daily-challenge" element={<DailyChallenge />} />
              <Route path="/games/family-mode" element={<FamilyMode />} />
              <Route path="/games/quick-battle" element={<QuickBattlePage />} />
              <Route path="/games/gauntlet" element={<GauntletPage />} />
              <Route path="/arcade" element={<ArcadePage />} />
              <Route path="/arcade/:mode" element={<ArcadePage />} />
              
              <Route path="/roast-v2" element={<RoastSessionV2 />} />
              <Route path="/roast-history" element={<RoastHistory userId={userId!} />} />
              <Route path="/roast-profile" element={<RoastProfile userId={userId!} onComplete={() => navigate('/roast-v2')} />} />
              <Route path="/daily-roast" element={<DailyRoast userId={userId!} />} />
              <Route path="/roast-battle" element={<RoastBattle userId={userId!} />} />

              <Route path="/about" element={<AboutPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/faq" element={<FAQPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsOfServicePage />} />
              <Route path="/cookies" element={<CookiePolicyPage />} />
            </Routes>
          </main>

          <Footer />

          <UsernameSetup 
            isOpen={showUsernameSetup}
            onComplete={(newUsername) => {
              setUsername(newUsername);
              setShowUsernameSetup(false);
            }}
            userId={userId}
          />
          <DailyLoginClaim />
          <CookieConsent />
          <OnboardingSplash />
        </div>
      </ToastProvider>
    </>
  );
}
