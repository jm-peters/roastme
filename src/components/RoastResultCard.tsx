import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { 
  WhatsAppIcon, 
  TwitterIcon, 
  FacebookIcon, 
  InstagramIcon, 
  TikTokIcon,
  TelegramIcon,
  CopyIcon,
  CheckIcon,
  LinkIcon
} from './ShareIcons';
import { TrendingUp, Skull, CheckCircle2, ArrowRight } from 'lucide-react';
import { generateShareMessage, generateCleanShareMessage } from '../utils/shareMessages';
import { generateShareImage } from '../utils/shareImageGenerator';
import { cn } from '../lib/utils';
import { useToast } from './Toast';
import { auth } from '../firebase';
import MomentCapture from './MomentCapture';

import { fetchWithAuth, retryWithBackoff } from '../utils/apiUtils';

interface RoastResultCardProps {
  roast: {
    id: string;
    text: string;
    photoUrl: string;
    username?: string;
    userId?: string;
    createdAt: string | number;
    intensity: string;
    isTrending?: boolean;
    feedScore?: number;
    trendingRank?: number;
    salvageMode?: string;
    savagenessScore?: number;
    creativityScore?: number;
    overallScore?: number;
    tier?: string;
    comboBonus?: number;
  };
  mode?: 'roast' | 'hype';
}

export default function RoastResultCard({ roast, mode = 'roast' }: RoastResultCardProps) {
  const [anonymous, setAnonymous] = useState(false);
  const { showToast } = useToast();
  const [publishToFeed, setPublishToFeed] = useState(true);
  const [shareLink, setShareLink] = useState('');
  const [shareImage, setShareImage] = useState('');
  const [copied, setCopied] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [postedToFeed, setPostedToFeed] = useState(false);
  const [earnedCoins, setEarnedCoins] = useState(0);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [opponentUsername, setOpponentUsername] = useState('');
  const [isChallenging, setIsChallenging] = useState(false);

  const username = localStorage.getItem('username') || 'roaster';

  useEffect(() => {
    const fetchShortLink = async () => {
      if (!roast.id) return;
      
      // Determine current UID safely
      const currentUserId = auth.currentUser?.uid || localStorage.getItem('userId');
      const isOwner = roast.userId === currentUserId;
      
      // If we're not the owner, we shouldn't be trying to shorten/map this roast to our handle
      // Instead, we just use the default long link or try to resolve if there's an existing one
      if (!isOwner && roast.username && roast.username !== 'anonymous') {
        setShareLink(`https://roastme.site/roast/${roast.username}`);
        return;
      }

      if (!auth.currentUser) {
        setShareLink(`https://roastme.site/roast/${roast.id}`);
        return;
      }

      try {
        const res = await retryWithBackoff(() => fetchWithAuth('/api/shorten', {
          method: 'POST',
          body: JSON.stringify({ 
            username: roast.username || username, 
            roastId: roast.id
          })
        }));
        const data = await res.json();
        setShareLink(data.shortUrl);
      } catch (err: any) {
        // Silently fall back for short links, but log if it's not a permission issue
        if (!err.message?.includes('403')) {
          console.error('Failed to fetch short link:', err);
        }
        setShareLink(`https://roastme.site/roast/${roast.id}`);
      }
    };

    fetchShortLink();
  }, [roast.id, roast.username, username, roast.userId]);

  useEffect(() => {
    if (roast.photoUrl && roast.text) {
      setIsGeneratingImage(true);
      generateShareImage(roast.photoUrl, roast.text, roast.userId || localStorage.getItem('userId') || 'anon').then((url) => {
        setShareImage(url);
        setIsGeneratingImage(false);
      });
    }
  }, [roast.photoUrl, roast.text, roast.userId]);

  const getShareLink = () => {
    if (anonymous) {
      return `https://roastme.site/roast/${roast.id}?anon=true`;
    }
    return shareLink || `https://roastme.site/roast/${roast.id}`;
  };

  const getShareMessage = (platform: string) => {
    const link = getShareLink();
    return generateCleanShareMessage(link, 'roast');
  };

  const handleShare = async (platform: string) => {
    const link = getShareLink();
    const message = platform === 'whatsapp' ? link : getShareMessage(platform);
    
    if (navigator.share && /mobile|android|iphone/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: '🔥 I got roasted on RoastMe!',
          text: message,
          url: link,
          files: [],
        });
        trackShare('native');
        return;
      } catch (err) {
        console.log('Native share failed, falling back to platform specific');
      }
    }

    const shareUrls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(link)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}&quote=${encodeURIComponent(roast.text)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(message)}`,
    };
    
    if (platform === 'instagram' || platform === 'tiktok') {
      if (shareImage) {
        const downloadLink = document.createElement('a');
        downloadLink.href = shareImage;
        downloadLink.download = `roast-${roast.id}.jpg`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        alert(
          `📸 Your roast image is ready!\n\n` +
          `1. Open ${platform === 'instagram' ? 'Instagram' : 'TikTok'}\n` +
          `2. Post this image/video\n` +
          `3. Copy this caption:\n\n"${message}"\n\n` +
          `4. Tag @roastme.site and use #RoastMeChallenge\n` +
          `5. Challenge your friends to roast back! 🔥`
        );
      }
    } else if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank');
    }
    
    trackShare(platform);
  };

  const trackShare = async (platform: string) => {
    try {
      const res = await retryWithBackoff(() => fetchWithAuth('/api/roasts/share', {
        method: 'POST',
        body: JSON.stringify({ 
          roastId: roast.id, 
          platform
        })
      }));
      const data = await res.json();
      if (data.coinsAwarded) {
        setEarnedCoins(prev => prev + data.coinsAwarded);
        setTimeout(() => setEarnedCoins(0), 3000);
      }
    } catch (error) {
      console.error('Failed to track share:', error);
    }
  };

  const handlePostToFeed = async () => {
    if (postedToFeed) return;
    setIsPosting(true);
    try {
      const res = await retryWithBackoff(() => fetchWithAuth('/api/roasts/share-to-feed', {
        method: 'POST',
        body: JSON.stringify({ 
          roastId: roast.id, 
          isAnonymous: anonymous
        })
      }));
      if (res.ok) {
        setPostedToFeed(true);
        trackShare('feed');
        showToast('Posted to global feed! 🔥');
      }
    } catch (err) {
      console.error('Failed to post to feed:', err);
    } finally {
      setIsPosting(false);
    }
  };

  const copyLink = () => {
    const link = getShareLink();
    navigator.clipboard.writeText(link);
    setCopied(true);
    showToast('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
    trackShare('copy_link');
  };

  const handleChallenge = async () => {
    if (!opponentUsername.trim()) {
      showToast('Please enter a username');
      return;
    }
    setIsChallenging(true);
    try {
      const res = await retryWithBackoff(() => fetchWithAuth('/api/battle/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opponentUsername: opponentUsername.trim(),
          challengerRoastId: roast.id
        })
      }));
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        setShowChallengeModal(false);
        setOpponentUsername('');
        if (navigator.share) {
          navigator.share({
            title: '⚔️ Roast Battle Challenge!',
            text: `I challenged you to a roast battle! Accept if you dare.`,
            url: data.shareLink
          });
        }
      } else {
        showToast(data.error || 'Failed to send challenge');
      }
    } catch (err) {
      showToast('Error sending challenge');
    } finally {
      setIsChallenging(false);
    }
  };

  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="mt-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden border border-red-500/30 relative"
    >
      <AnimatePresence>
        {earnedCoins > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: -40, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-500 text-brutal-black px-4 py-1 rounded-full font-bold text-sm flex items-center gap-2 shadow-xl z-50"
          >
            🪙 +{earnedCoins} COINS EARNED!
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-700">
        <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold brutal-border">
          {roast.username?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <p className="text-white font-medium">@{roast.username || 'anonymous'}</p>
          <p className="text-gray-500 text-xs">{new Date(roast.createdAt).toLocaleDateString()}</p>
        </div>
        {roast.feedScore && roast.feedScore > 100 && (
          <span className="ml-auto text-yellow-500 text-xs font-mono uppercase tracking-widest">
            🔥 TRENDING #{roast.trendingRank || 1}
          </span>
        )}
      </div>

      {/* Roast Text & Image */}
      <div className="relative">
        <MomentCapture roast={{ text: roast.text, photoUrl: roast.photoUrl || '', savagenessScore: roast.savagenessScore, creativityScore: roast.creativityScore, overallScore: roast.overallScore, username: roast.username || 'anonymous' }}>
          <div>
            {roast.photoUrl && roast.photoUrl.trim() !== "" && (
              <div className="p-6 flex justify-center">
                <div className="relative group">
                  <img 
                    src={roast.photoUrl} 
                    alt="Roast" 
                    className="w-64 h-64 rounded-full object-cover border-4 border-red-500/50 grayscale hover:grayscale-0 transition-all duration-500" 
                  />
                  {isGeneratingImage && (
                    <div className="absolute inset-0 bg-brutal-black/50 rounded-full flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-neon-green border-t-transparent animate-spin rounded-full" />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="px-6 pb-4 text-center">
              <div className="text-white text-xl md:text-2xl italic font-display leading-tight">
                <Markdown>{"\"" + roast.text + "\""}</Markdown>
              </div>
              {roast.salvageMode && roast.salvageMode !== 'none' && (
                <p className="text-gray-400 text-sm mt-2 font-mono">All in good fun 🔥</p>
              )}
            </div>
            
            {roast.savagenessScore !== undefined && (
              <div className="flex justify-center gap-6 px-6 pb-6 mt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500">{roast.savagenessScore}/10</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">SAVAGENESS</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-500">{roast.creativityScore}/10</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">CREATIVITY</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-500">{roast.overallScore}/10</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">OVERALL</div>
                </div>
              </div>
            )}
            
            {/* Display Combo Bonus if any */}
            {roast.comboBonus !== undefined && roast.comboBonus > 0 && (
              <div className="flex justify-center px-6 pb-2">
                <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white text-xs font-bold px-3 py-1 rounded-full animate-bounce">
                  🔥 +{roast.comboBonus} RMP COMBO BONUS!
                </div>
              </div>
            )}
            
            <div className="text-center pb-2 cursor-pointer text-gray-500 hover:text-white transition-colors text-xs font-mono mt-2">
              📸 Click area to capture moment
            </div>
          </div>
        </MomentCapture>
      </div>

      {/* TRENDING BADGE - if applicable */}
      {roast.isTrending && (
        <div className="mx-6 mb-4 bg-yellow-500/20 border border-yellow-500 rounded-lg p-2 text-center">
          <p className="text-yellow-400 text-[10px] font-bold font-mono uppercase tracking-widest">
            🔥 TRENDING #1 POTENTIAL • THIS ONE GOT ME LAUGHING • LEADERBOARD MATERIAL
          </p>
        </div>
      )}

      {/* SHARE OPTIONS - Directly below roast text */}
      <div className="p-6 border-t border-gray-700 space-y-4">
        {/* Toggle Options Row */}
        <div className="flex flex-wrap gap-4 justify-between items-center">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={anonymous} 
              onChange={(e) => setAnonymous(e.target.checked)} 
              className="w-4 h-4 accent-orange-600" 
            />
            <span className="text-gray-300 text-xs font-mono uppercase tracking-widest group-hover:text-white transition-colors">
              👻 Share Anonymously
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={publishToFeed} 
              onChange={(e) => setPublishToFeed(e.target.checked)} 
              className="w-4 h-4 accent-neon-green" 
            />
            <span className="text-gray-300 text-xs font-mono uppercase tracking-widest group-hover:text-white transition-colors">
              📱 Post to Public Feed
            </span>
          </label>
        </div>

        {/* Share Now Button */}
        <button 
          onClick={handlePostToFeed}
          disabled={isPosting || postedToFeed}
          className={cn(
            "w-full font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2",
            postedToFeed 
              ? "bg-neon-green text-brutal-black" 
              : "bg-gradient-to-r from-green-600 to-teal-600 text-white"
          )}
        >
          {postedToFeed ? (
            <><CheckCircle2 size={20} /> POSTED TO FEED!</>
          ) : (
            isPosting ? 'POSTING...' : 'SHARE NOW'
          )}
        </button>

        {/* Info Text */}
        <p className="text-gray-500 text-[10px] text-center font-mono uppercase tracking-widest">
          Share your roast to the global feed to earn RMP and climb the leaderboard!
        </p>

        {/* Challenge Button */}
        <button 
          onClick={() => setShowChallengeModal(true)} 
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 mt-4"
        >
          ⚔️ CHALLENGE FRIEND TO A BATTLE
        </button>

        {/* Platform Buttons Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button onClick={() => handleShare('whatsapp')} className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl transition transform hover:scale-105">
            <WhatsAppIcon /> WhatsApp
          </button>
          <button onClick={() => handleShare('instagram')} className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl transition transform hover:scale-105">
            <InstagramIcon /> Instagram
          </button>
          <button onClick={() => handleShare('twitter')} className="flex items-center justify-center gap-2 bg-black hover:bg-gray-800 text-white py-3 rounded-xl transition border border-gray-700 transform hover:scale-105">
            <TwitterIcon /> Twitter
          </button>
          <button onClick={() => handleShare('tiktok')} className="flex items-center justify-center gap-2 bg-black text-white py-3 rounded-xl transition border border-gray-700 transform hover:scale-105">
            <TikTokIcon /> TikTok
          </button>
          <button onClick={() => handleShare('facebook')} className="flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white py-3 rounded-xl transition transform hover:scale-105">
            <FacebookIcon /> Facebook
          </button>
          <button onClick={() => handleShare('telegram')} className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl transition transform hover:scale-105">
            <TelegramIcon /> Telegram
          </button>
        </div>

        {/* Copy Link Button */}
        <button 
          onClick={copyLink} 
          className="w-full bg-gray-800 hover:bg-gray-700 text-white py-4 rounded-xl transition-all flex items-center justify-center gap-2 border border-white/10"
        >
          {copied ? <CheckIcon /> : <LinkIcon />}
          <span className="font-mono text-sm uppercase tracking-widest">
            {copied ? 'LINK COPIED!' : 'COPY ROAST LINK'}
          </span>
        </button>

        {/* Footer Message */}
        <div className="text-center text-gray-500 text-[10px] pt-4 border-t border-gray-700 font-mono uppercase tracking-[0.2em]">
          <p>⚡ EVERY SHARE = CHALLENGE SENT • NO ROAST BACK = PERMANENT L • TOP ROASTER THIS WEEK WINS $100</p>
        </div>

        {/* Featured Gear Section */}
        <div className="mt-4 pt-4 border-t border-gray-700/50 px-6 pb-6">
          <a 
            href="https://amzn.to/48ldi2W" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-between bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/5 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neon-green/20 rounded-lg flex items-center justify-center text-neon-green">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="text-[10px] font-mono text-gallery-white/40 uppercase tracking-widest">Recommended for Creators</p>
                <p className="text-xs text-white font-medium group-hover:text-neon-green transition-colors">Level up your setup with this gear</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-gallery-white/20 group-hover:text-neon-green group-hover:translate-x-1 transition-all" />
          </a>
        </div>
      </div>

      {showChallengeModal && (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6">
          <h3 className="text-2xl font-bold font-display text-white mb-4">CHALLENGE FRIEND</h3>
          <p className="text-gray-400 text-sm text-center mb-6 max-w-xs">Enter their username to challenge them to a public roast battle. Winner takes 100 RMP!</p>
          <input
            type="text"
            placeholder="@username"
            value={opponentUsername}
            onChange={(e) => setOpponentUsername(e.target.value.replace('@', ''))}
            className="bg-gray-800 border-2 border-purple-500/30 text-white px-4 py-3 rounded-xl w-full max-w-xs mb-4 text-center focus:outline-none focus:border-purple-500"
          />
          <div className="flex gap-3 w-full max-w-xs">
            <button 
              onClick={() => setShowChallengeModal(false)}
              className="flex-1 bg-gray-700 text-white py-3 rounded-xl font-bold"
            >
              CANCEL
            </button>
            <button 
              onClick={handleChallenge}
              disabled={isChallenging}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-bold"
            >
              {isChallenging ? 'SENDING...' : 'CHALLENGE!'}
            </button>
          </div>
        </div>
      )}

    </motion.div>
  );
}
