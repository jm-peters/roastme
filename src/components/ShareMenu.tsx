// src/components/ShareMenu.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
import { Share2, X } from 'lucide-react';
import { useToast } from './Toast';
import { generateCleanShareMessage } from '../utils/shareMessages';
import { generateShareImage } from '../utils/shareImageGenerator';
import { cn } from '../lib/utils';
import { fetchWithAuth } from '../utils/apiUtils';

interface ShareMenuProps {
  roastId: string;
  roastText: string;
  photoUrl?: string;
  username?: string;
  userId?: string;
  className?: string;
}

export default function ShareMenu({ roastId, roastText, photoUrl, username, userId, className }: ShareMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [shareImage, setShareImage] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    // Generate base link
    const baseLink = `${window.location.origin}/roast/${roastId}`;
    setShareLink(baseLink);

    // Try to get short link if possible (silent fail)
    const fetchShortify = async () => {
      try {
        const res = await fetchWithAuth('/api/shorten', {
          method: 'POST',
          body: JSON.stringify({ roastId, username })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.shortUrl) setShareLink(data.shortUrl);
        }
      } catch (e) {
        // Silently ignore shorten errors to keep UX smooth
      }
    };
    fetchShortify();
  }, [roastId, username]);

  useEffect(() => {
    // Only generate image if menu is open and we have a photo
    if (photoUrl && roastText && isOpen && !shareImage) {
      setIsGeneratingImage(true);
      generateShareImage(photoUrl, roastText, userId || 'anon', username)
        .then(setShareImage)
        .catch(console.error)
        .finally(() => setIsGeneratingImage(false));
    }
  }, [photoUrl, roastText, userId, username, isOpen, shareImage]);

  const handleShare = async (platform: string) => {
    const message = generateCleanShareMessage(shareLink);

    // Try native share on mobile if supported
    if (navigator.share && /mobile|android|iphone/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: '🔥 RoastMe!',
          text: `Check out this roast: "${roastText.slice(0, 50)}..."`,
          url: shareLink,
        });
        return;
      } catch (err) {
        // Fallback to specific platform logic
      }
    }

    const shareUrls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(shareLink)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(message)}`,
    };

    if (platform === 'instagram' || platform === 'tiktok') {
      if (shareImage) {
        const downloadLink = document.createElement('a');
        downloadLink.href = shareImage;
        downloadLink.download = `roast-${roastId}.jpg`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        showToast('Image downloaded! Share it on ' + platform);
      } else if (photoUrl) {
        showToast('Generating share image... give it a second 🔥');
      } else {
        // No photo, just copy link as primary method for IG/TikTok
        copyLink();
        showToast('Link copied! Instagram/TikTok share works best with a photo.');
      }
    } else if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank');
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    showToast('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const menuVariants = {
    closed: { opacity: 0, scale: 0.95, y: 10, pointerEvents: 'none' as const },
    open: { opacity: 1, scale: 1, y: 0, pointerEvents: 'auto' as const }
  };

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-neon-green text-brutal-black text-xs font-bold hover:bg-white transition-all active:scale-95"
      >
        <Share2 className="w-4 h-4" />
        SHARE
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for closing */}
            <div 
              className="fixed inset-0 z-40 bg-transparent" 
              onClick={() => setIsOpen(false)} 
            />
            
            <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              variants={menuVariants}
              className="absolute bottom-full right-0 mb-4 w-72 bg-brutal-black border-2 border-neon-green p-4 z-50 shadow-[8px_8px_0px_0px_rgba(0,255,0,0.3)] min-w-[280px]"
            >
              <div className="flex justify-between items-center mb-4 border-b border-neon-green/20 pb-2">
                <div className="flex items-center gap-2">
                  <Share2 className="w-3 h-3 text-neon-green" />
                  <span className="text-xs font-bold text-neon-green uppercase tracking-widest font-mono">Blast Roast</span>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-neon-green/50 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <PlatformButton 
                  icon={<WhatsAppIcon />} 
                  label="WhatsApp" 
                  onClick={() => handleShare('whatsapp')} 
                  color="hover:bg-green-600/20"
                />
                <PlatformButton 
                  icon={<TwitterIcon />} 
                  label="Twitter / X" 
                  onClick={() => handleShare('twitter')} 
                  color="hover:bg-white/10"
                />
                <PlatformButton 
                  icon={<TelegramIcon />} 
                  label="Telegram" 
                  onClick={() => handleShare('telegram')} 
                  color="hover:bg-blue-500/20"
                />
                <PlatformButton 
                  icon={<InstagramIcon />} 
                  label="Instagram" 
                  onClick={() => handleShare('instagram')} 
                  color="hover:bg-pink-600/20"
                />
                <PlatformButton 
                  icon={<TikTokIcon />} 
                  label="TikTok" 
                  onClick={() => handleShare('tiktok')} 
                  color="hover:bg-white/10"
                />
                <PlatformButton 
                  icon={<FacebookIcon />} 
                  label="Facebook" 
                  onClick={() => handleShare('facebook')} 
                  color="hover:bg-blue-700/20"
                />
              </div>

              <div className="space-y-2">
                <button
                  onClick={copyLink}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-neon-green/10 border border-neon-green/30 text-neon-green text-xs font-bold hover:bg-neon-green/20 transition-all font-mono"
                >
                  {copied ? <CheckIcon /> : <LinkIcon />}
                  {copied ? 'COPIED TO CLIPBOARD!' : 'COPY ROAST LINK'}
                </button>
              </div>

              {isGeneratingImage && (
                <div className="mt-4 pt-2 border-t border-neon-green/10 flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-neon-green rounded-full animate-ping" />
                  <span className="text-[10px] text-neon-green/60 uppercase font-mono tracking-tighter">
                    Crafting share image...
                  </span>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

interface PlatformButtonProps {
  icon: any;
  label: string;
  onClick: () => void;
  color: string;
}

function PlatformButton({ icon, label, onClick, color }: PlatformButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-2 p-2 rounded border border-neon-green/5 transition-all group",
        color
      )}
    >
      <div className="transition-transform group-hover:scale-110 group-active:scale-90">
        {icon}
      </div>
      <span className="text-[8px] font-bold text-neon-green/40 group-hover:text-neon-green uppercase tracking-tighter text-center leading-none transition-colors">
        {label}
      </span >
    </button>
  );
}
