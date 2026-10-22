// src/components/MarqueeHeader.tsx
import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import AdBanner from './AdBanner';

interface MarqueeItem {
  text: string;
  type: 'roast' | 'hype';
  emoji: string;
}

const marqueeItems: MarqueeItem[] = [
  // Roast prompts
  { text: "roast your best friend", type: "roast", emoji: "🔥" },
  { text: "roast your ex 😂", type: "roast", emoji: "💔" },
  { text: "roast that silent WhatsApp group", type: "roast", emoji: "📱" },
  { text: "roast that one boring bro", type: "roast", emoji: "😴" },
  { text: "roast your rival", type: "roast", emoji: "⚔️" },
  { text: "roast that one person who asks for favor", type: "roast", emoji: "🙏" },
  { text: "roast your classmates", type: "roast", emoji: "📚" },
  { text: "roast your e-football friends", type: "roast", emoji: "⚽" },
  { text: "roast that guy with forehead", type: "roast", emoji: "🤯" },
  { text: "roast that one person who is ugly", type: "roast", emoji: "" },
  { text: "tell them the truth in the most positive humourous way", type: "roast", emoji: "💯" },
  { text: "join the bible trivia challenge", type: "hype", emoji: "📖" },
  { text: "prank a friend", type: "roast", emoji: "🎭" },
  { text: "create an anonymous message link", type: "hype", emoji: "👻" },
  { text: "play truth or dare", type: "roast", emoji: "🎲" },
  
  // Hype prompts (positive interactions)
  { text: "hype your friend for an achievement", type: "hype", emoji: "🏆" },
  { text: "hype your girlfriend", type: "hype", emoji: "❤️" },
  { text: "hype your boyfriend", type: "hype", emoji: "💙" },
  { text: "hype that one person who is amazing", type: "hype", emoji: "✨" },
  { text: "make someone's day with a hype", type: "hype", emoji: "🎉" },
  { text: "celebrate your bestie", type: "hype", emoji: "🥳" },
  { text: "big up your day one", type: "hype", emoji: "🤝" },
  { text: "appreciate that underrated friend", type: "hype", emoji: "⭐" }
];

export default function MarqueeHeader() {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Fetch notifications unread count
    const fetchUnread = async () => {
      const user = auth.currentUser;
      if (!user) return;
      
      try {
        const token = await user.getIdToken();
        if (token) {
          const res = await fetch('/api/notifications', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          const unread = data.notifications?.filter((n: any) => !n.read).length || 0;
          setUnreadCount(unread);
        }
      } catch (err) {
        // Silent error
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-gradient-to-r from-black via-gray-900 to-black border-b border-red-500/30 overflow-hidden py-1.5 relative">
      {/* Notification Bell */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 md:right-8">
        <button 
          onClick={() => navigate('/truthordare/inbox')}
          className="relative group p-1.5 bg-white/5 brutal-border border-white/10 hover:bg-neon-green hover:text-brutal-black transition-all"
        >
          <Bell size={16} className="group-hover:animate-bounce" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center brutal-border border-white">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Main Marquees Container */}
      <div className="flex flex-col gap-0.5 pr-12">
        {/* First Marquee */}
        <div className="relative flex overflow-x-hidden">
          <div className="animate-marquee whitespace-nowrap py-0.5">
            {[...marqueeItems, ...marqueeItems].map((item, index) => (
              <span
                key={`m1-${index}`}
                className={`inline-flex items-center mx-2 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                  item.type === 'roast'
                    ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                    : 'bg-green-500/10 text-green-400 border border-green-500/30'
                }`}
              >
                <span className="mr-1.5">{item.emoji}</span>
                <span>{item.text}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Second Marquee (Reverse direction) */}
        <div className="relative flex overflow-x-hidden">
          <div className="animate-marquee-reverse whitespace-nowrap py-0.5">
            {[...marqueeItems.slice(5), ...marqueeItems.slice(0, 5), ...marqueeItems.slice(5), ...marqueeItems.slice(0, 5)].map((item, index) => (
              <span
                key={`m2-${index}`}
                className={`inline-flex items-center mx-2 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                  item.type === 'roast'
                    ? 'bg-red-500/5 text-red-400/70 border border-red-500/20'
                    : 'bg-green-500/5 text-green-400/70 border border-green-500/20'
                }`}
              >
                <span className="mr-1.5">{item.emoji}</span>
                <span>{item.text}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full max-w-4xl mx-auto px-4 mt-1.5 mb-1">
        <AdBanner type="standard" />
      </div>
    </div>
  );
}
