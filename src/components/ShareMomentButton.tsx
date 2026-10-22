// components/ShareMomentButton.tsx
import { useState, useEffect } from 'react';
import { Share2 } from 'lucide-react';

interface ShareMomentButtonProps {
  momentType: 'fail' | 'roast' | 'combo';
  text: string;
}

export default function ShareMomentButton({ momentType, text }: ShareMomentButtonProps) {
  const [showShare, setShowShare] = useState(false);
  
  useEffect(() => {
    // Show share button after sound plays
    const timer = setTimeout(() => setShowShare(true), 1500);
    return () => clearTimeout(timer);
  }, []);
  
  const shareMessage = () => {
    let prefix = "Check this out: ";
    if (momentType === 'fail') prefix = "I failed! Can you beat me? ";
    
    const shareText = `${prefix}"${text}"\n\nhttps://roastme.site`;
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };
  
  if (!showShare) return null;
  
  return (
    <button
      onClick={shareMessage}
      className="mt-4 font-mono text-[10px] uppercase tracking-widest text-neon-green hover:text-white transition-colors flex items-center gap-2 mx-auto"
    >
      <Share2 size={12} /> Share this moment
    </button>
  );
}
