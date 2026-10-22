import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  ArrowLeft, 
  Skull,
  RefreshCw,
  Zap,
  Wand2
} from 'lucide-react';
import RoastSessionV2 from './roast/RoastSessionV2';
import { cn } from '../lib/utils';
import StatsCard from '../components/StatsCard';
import MarqueeHeader from '../components/MarqueeHeader';
import RoastResultCard from '../components/RoastResultCard';
import Footer from '../components/Footer';
import DailyQuests from '../components/DailyQuests';
import { auth, db } from '../firebase';
import { enhanceRoast, addSalvageMode, getFallbackRoast } from '../utils/roastEnhancer';
import { optimizeImage } from "../utils/imageOptimizer";
import { fetchWithAuth, retryWithBackoff } from "../utils/apiUtils";
import { soundManager } from "../utils/soundManager";
import { getCurrentTheme } from "../services/automationService";

export default function RoastPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [roast, setRoast] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);
  const [input, setInput] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const currentTheme = getCurrentTheme();

  useEffect(() => {
    const fetchRoast = async () => {
      if (!id) return;
      try {
        const res = await retryWithBackoff(() => fetch(`/api/roasts/${id}`));
        const data = await res.json();
        if (data && !data.error) {
          setRoast(data);
        }
      } catch (error) {
        console.error('Failed to fetch roast after retries:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShortLink();
    fetchRoast();
  }, [id]);

  useEffect(() => {
    if (roast) {
      // Determine intensity based on roast intensity setting
      const intensity = roast.intensity === 'brutal' ? 'loud' : 
                        roast.intensity === 'mild' ? 'soft' : 'normal';
      soundManager.onRoastReceived(intensity);
    }
  }, [roast]);

  const fetchShortLink = async () => {
    // Placeholder for any short link logic if needed on this page
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const optimized = await optimizeImage(file);
        setPhotoUrl(optimized);
      } catch (err) {
        console.error("Image optimization failed:", err);
        const reader = new FileReader();
        reader.onloadend = () => setPhotoUrl(reader.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  const generateNewRoast = async () => {
    if (!input.trim() && !photoUrl) return;
    if (!auth.currentUser) {
      soundManager.onUserMistake('repeated_fail');
      return;
    }
    setGenerating(true);
    soundManager.playFaaah('soft');
    try {
      console.log("[GENERATION] Starting new roast generation...");
      // 1. Check server-side cache first
      const cacheRes = await retryWithBackoff(() => fetchWithAuth('/api/roasts/check-cache', {
        method: 'POST',
        body: JSON.stringify({
          input,
          mode: 'roast',
          generationCount
        })
      }));

      let text = "";
      let isCached = false;

      if (cacheRes.ok) {
        const cacheData = await cacheRes.json();
        if (cacheData.found) {
          text = cacheData.text;
          isCached = true;
        }
      }

      // 2. If not in cache, generate on client
      if (!isCached) {
        console.log("[GENERATION] Cache miss, generating on server...");
        try {
          const res = await retryWithBackoff(() => fetchWithAuth('/api/generate-roast', {
            method: 'POST',
            body: JSON.stringify({
              target: input,
              photo: photoUrl,
              mode: 'roast',
              publishToFeed: true,
              shareAnonymously: false
            })
          }));
          
          const data = await res.json();
          if (data.success) {
            text = data.roast.text;
            setRoast(data.roast);
            setGenerationCount(prev => prev + 1);
            soundManager.onRoastGenerated();
            window.history.pushState({}, '', `/roast/${data.roast.id}`);
            setGenerating(false);
            return; // Exit early as we already saved and set the roast
          } else {
            throw new Error(data.error || "Generation failed on server");
          }
        } catch (error: any) {
          console.error("[GENERATION] Server generation failed:", error);
          text = getFallbackRoast('roast', input);
          text = "✨ [Safe Mode Active] " + text;
        }
      }
      
      text = enhanceRoast(text, {
        intensity: 'brutal',
        languageComplexity: 'complex',
        includeSalvage: true,
        roastType: 'challenge'
      });
      text = addSalvageMode(text, 'heavy');

      const newId = Math.random().toString(36).substr(2, 9);
      
      const saveRes = await retryWithBackoff(() => fetchWithAuth('/api/roasts', {
        method: 'POST',
        body: JSON.stringify({
          id: newId,
          text,
          input, // Store input for caching
          photoUrl,
          mode: 'roast',
          intensity: 'brutal',
          languageComplexity: 'complex',
          roastType: 'challenge',
          salvageMode: 'heavy'
        })
      }));

      if (saveRes.ok) {
        const savedData = await saveRes.json();
        setRoast(savedData);
        setGenerationCount(prev => prev + 1);
        soundManager.onRoastGenerated();
        window.history.pushState({}, '', `/roast/${newId}`);
      }
    } catch (error) {
      console.error("Generation error:", error);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brutal-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-neon-green border-t-transparent animate-spin rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-gallery-white font-sans selection:bg-neon-green selection:text-brutal-black">
      <main className="max-w-2xl mx-auto p-6 pt-0 w-full pb-24">
        {/* HEADERS & STATS - PRESERVED */}
        <StatsCard />
        <DailyQuests />

        {/* INTEGRATED V2 SESSION */}
        <div className="mt-8">
           <RoastSessionV2 />
        </div>

        <div className="mt-12 flex justify-center pb-8">
          <Link 
            to="/" 
            className="group flex items-center gap-3 px-8 py-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all hover:scale-105"
          >
            <ArrowLeft className="w-5 h-5 text-neon-green group-hover:-translate-x-1 transition-transform" />
            <span className="font-display uppercase tracking-[0.2em] text-sm font-bold">Return to Dashboard</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
