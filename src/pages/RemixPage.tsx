import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  RefreshCw, 
  ArrowLeft, 
  Flame, 
  Zap, 
  ArrowRight,
  Skull,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import MarqueeHeader from '../components/MarqueeHeader';
import { cn } from '../lib/utils';
import confetti from 'canvas-confetti';

interface Roast {
  id: string;
  text: string;
  photoUrl?: string;
  userId: string;
  user?: { username: string };
}

export default function RemixPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [original, setOriginal] = useState<Roast | null>(null);
  const [remixText, setRemixText] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOriginal = async () => {
      try {
        const res = await fetch(`/api/roasts/${id}`);
        if (!res.ok) throw new Error('Roast not found');
        const data = await res.json();
        setOriginal(data);
        setRemixText(data.text);
      } catch (err) {
        setError('Failed to load original roast');
      } finally {
        setLoading(false);
      }
    };
    fetchOriginal();
  }, [id]);

  const handleRemix = async () => {
    if (!remixText.trim()) return;
    setGenerating(true);
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch('/api/remix/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalId: id,
          text: remixText,
          photoUrl: original?.photoUrl,
          userId
        })
      });
      
      const data = await res.json();
      if (data.success) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00FF00', '#FFFFFF', '#FFD700']
        });
        setTimeout(() => navigate(`/roast/${data.id}`), 1500);
      }
    } catch (err) {
      setError('Failed to generate remix');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brutal-black flex items-center justify-center">
        <RefreshCw className="animate-spin text-neon-green" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center selection:bg-neon-green selection:text-brutal-black pb-24">
      <MarqueeHeader />
      
      <main className="max-w-3xl w-full px-6 py-12 flex flex-col gap-12">
        <div className="flex justify-between items-center">
          <Link to="/feed" className="text-gallery-white/40 hover:text-neon-green transition-colors flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest">
            <ArrowLeft size={14} /> Back to Feed
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
            <span className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest">Remix Studio</span>
          </div>
        </div>

        <section className="text-center space-y-4">
          <motion.h1 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-6xl md:text-8xl leading-none uppercase font-display"
          >
            REMIX <span className="text-neon-green">FIRE</span>
          </motion.h1>
          <p className="text-gallery-white/60 font-mono text-xs uppercase tracking-[0.3em]">
            Make it better. Make it worse. Make it yours.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Original */}
          <div className="space-y-4">
            <h3 className="text-gallery-white/40 font-mono text-[10px] uppercase tracking-widest flex items-center gap-2">
              <Skull size={12} /> Original Roast
            </h3>
            <div className="brutal-border p-6 bg-gallery-white/5 opacity-60">
              <div className="font-display text-xl leading-tight mb-4">
                <Markdown>{original?.text}</Markdown>
              </div>
              {original?.photoUrl && original.photoUrl.trim() !== "" && (
                <div className="brutal-border overflow-hidden h-32">
                  <img src={original.photoUrl} alt="Original" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          {/* Remix Input */}
          <div className="space-y-4">
            <h3 className="text-neon-green font-mono text-[10px] uppercase tracking-widest flex items-center gap-2">
              <Flame size={12} /> Your Remix
            </h3>
            <div className="space-y-4">
              <textarea
                value={remixText}
                onChange={(e) => setRemixText(e.target.value)}
                className="w-full h-48 bg-transparent brutal-border p-6 font-mono text-lg focus:outline-none focus:ring-2 focus:ring-neon-green transition-all placeholder:text-gallery-white/20"
                placeholder="Add your own spice..."
              />
              <button 
                onClick={handleRemix}
                disabled={generating || !remixText.trim()}
                className="w-full brutal-btn py-6 text-xl flex items-center justify-center gap-4 disabled:opacity-50"
              >
                {generating ? <RefreshCw className="animate-spin" /> : <>PUBLISH REMIX <ArrowRight /></>}
              </button>
              <div className="bg-neon-green/10 border border-neon-green/30 p-4 flex items-center gap-3">
                <Award className="text-neon-green" />
                <p className="text-neon-green font-mono text-[10px] uppercase tracking-widest">
                  Earn 3 coins for remixing! 🔥
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full border-t border-gallery-white/10 py-12 px-6 mt-auto">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <Link to="/" className="font-display text-2xl">ROAST<span className="text-neon-green">ME</span></Link>
          <div className="flex flex-wrap justify-center gap-6 font-mono text-xs uppercase tracking-widest opacity-50">
            <Link to="/about" className="hover:text-neon-green">About</Link>
            <Link to="/how-it-works" className="hover:text-neon-green">How It Works</Link>
            <Link to="/faq" className="hover:text-neon-green">FAQ</Link>
            <Link to="/contact" className="hover:text-neon-green">Contact</Link>
            <Link to="/privacy" className="hover:text-neon-green">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
