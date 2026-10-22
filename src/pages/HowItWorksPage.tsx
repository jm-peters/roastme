import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Flame, LayoutGrid, Swords, Users, Dice5, Ghost, AlertTriangle, Coins } from 'lucide-react';
import { cn } from '../lib/utils';

export default function HowItWorksPage() {
  const [activeTab, setActiveTab] = useState('roast');

  const sections: Record<string, any> = {
    roast: {
      title: "Roast Generator",
      icon: <Flame size={24} />,
      steps: [
        { step: 1, title: "Upload or Take a Photo", description: "Take a selfie or upload a photo of yourself or the person you want to roast." },
        { step: 2, title: "Set Your Roast Preferences", description: "Choose intensity (Mild/Medium/Brutal), language complexity, and roast style." },
        { step: 3, title: "Click 'Create Roast'", description: "Our system generates a savage, personalized roast just for you." },
        { step: 4, title: "Share & Challenge", description: "Share your roast on WhatsApp, Instagram, X, or TikTok. Challenge friends to roast back!" }
      ]
    },
    feed: {
      title: "Roast Feed",
      icon: <LayoutGrid size={24} />,
      steps: [
        { step: 1, title: "Browse Public Roasts", description: "Scroll through an infinite feed of roasts created by the community." },
        { step: 2, title: "React & Engage", description: "Use reactions (😂 💀 🔥) to show appreciation for the funniest roasts." },
        { step: 3, title: "Remix Roasts", description: "Take any roast and create your own variation. Earn RMP points for each remix." },
        { step: 4, title: "Post to Feed", description: "When you create a roast, choose to publish it to the public feed for everyone to see." }
      ]
    },
    battle: {
      title: "Battle Mode",
      icon: <Swords size={24} />,
      steps: [
        { step: 1, title: "Enter the Arena", description: "Pay 100 RMP to enter a battle against another roast." },
        { step: 2, title: "Vote for the Winner", description: "Two roasts appear side by side. Choose which one is funnier." },
        { step: 3, title: "Earn Points", description: "Your vote helps determine the winner. Earn coins and climb the leaderboard." },
        { step: 4, title: "Continuous Battles", description: "After each vote, a new battle loads instantly. Keep playing!" }
      ]
    },
    friendship: {
      title: "Friendship Challenge",
      icon: <Users size={24} />,
      steps: [
        { step: 1, title: "Choose Your Challenge Type", description: "Select from Custom, Couples, Best Friends, or Siblings edition." },
        { step: 2, title: "Answer Questions About Yourself", description: "Select your answers from multiple-choice options for each question." },
        { step: 3, title: "Share the Challenge Link", description: "Send the unique link to your friend via WhatsApp or any platform." },
        { step: 4, title: "Friend Answers", description: "Your friend answers the same questions. The system compares answers." },
        { step: 5, title: "See Your Match Score", description: "Get a percentage score showing how well your friend knows you!" }
      ]
    },
    truthordare: {
      title: "Truth or Dare",
      icon: <Dice5 size={24} />,
      steps: [
        { step: 1, title: "Choose Your Mode", description: "Play Solo, Challenge a Friend, or Send to Anyone with a link." },
        { step: 2, title: "Get a Challenge", description: "Spin to receive either a Truth question or a Dare." },
        { step: 3, title: "Complete the Challenge", description: "Answer honestly or complete the dare. No backing out!" },
        { step: 4, title: "Send & Receive Responses", description: "Your response goes to an inbox. Continue the conversation." }
      ]
    },
    anonymous: {
      title: "Anonymous Messages",
      icon: <Ghost size={24} />,
      steps: [
        { step: 1, title: "Create Your Anonymous Link", description: "Choose a username and generate your unique anonymous message link." },
        { step: 2, title: "Share the Link", description: "Post it on WhatsApp, Instagram, or X. Let people message you anonymously." },
        { step: 3, title: "Receive Messages", description: "Messages arrive in your inbox. No names, no tracking, complete privacy." },
        { step: 4, title: "Reply Anonymously", description: "You can also reply back without revealing your identity." }
      ]
    },
    prank: {
      title: "Prank Link Generator",
      icon: <AlertTriangle size={24} />,
      steps: [
        { step: 1, title: "Choose a Prank Type", description: "Select from Win Prank, I Like You, I Love You, You Owe Me, You Failed, and more." },
        { step: 2, title: "Customize Your Prank", description: "Add a custom message and reveal text." },
        { step: 3, title: "Generate & Share Link", description: "Create a unique link and send it to your victim." },
        { step: 4, title: "Watch Them React", description: "They see a surprise box, read the message, then discover it's just a prank!" }
      ]
    },
    coins: {
      title: "Coins & RMP System",
      icon: <Coins size={24} />,
      steps: [
        { step: 1, title: "Earn RMP", description: "Create roasts (20 RMP), share to feed (10 RMP), remix (10-20 RMP)." },
        { step: 2, title: "Earn Coins", description: "External shares (1 coin), referrals (1 coin), battle wins (5 coins)." },
        { step: 3, title: "Convert RMP to Coins", description: "100 RMP = 1 Coin. Use coins to unlock features and climb leaderboards." },
        { step: 4, title: "Monthly Competition", description: "Top coin earners win prizes and get featured on the leaderboard." }
      ]
    }
  };

  return (
    <div className="min-h-screen bg-brutal-black text-gallery-white font-sans selection:bg-neon-green selection:text-brutal-black">
      <nav className="p-6 flex justify-between items-center border-b-2 border-gallery-white/10">
        <Link to="/" className="text-2xl font-display uppercase group flex items-center gap-2">
          ROAST<span className="text-neon-green group-hover:text-white transition-colors">ME</span>
        </Link>
        <Link to="/" className="brutal-btn py-2 px-4 text-xs flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> BACK TO ROASTING
        </Link>
      </nav>

      <main className="max-w-4xl mx-auto p-6 py-16">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="space-y-12"
        >
          <header className="border-b-4 border-neon-green pb-8">
            <h1 className="text-6xl md:text-8xl font-display uppercase leading-none">How It Works</h1>
            <p className="font-mono text-neon-green mt-4 uppercase tracking-[0.2em]">Your guide to the roast-verse 🔥</p>
          </header>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-3 justify-center">
            {Object.entries(sections).map(([key, section]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  "px-4 py-2 brutal-border font-mono text-[10px] uppercase tracking-widest transition-all flex items-center gap-2",
                  activeTab === key 
                    ? 'bg-neon-green text-brutal-black border-neon-green' 
                    : 'bg-gallery-white/5 text-gallery-white/40 border-gallery-white/10 hover:border-white hover:text-white'
                )}
              >
                {section.icon}
                <span className="hidden sm:inline">{section.title}</span>
              </button>
            ))}
          </div>

          {/* Active Section Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="bg-gallery-white/5 brutal-border p-8 border-neon-green/30 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-neon-green/5 blur-3xl -mr-32 -mt-32" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-4 bg-neon-green text-brutal-black brutal-border">
                    {sections[activeTab].icon}
                  </div>
                  <h2 className="text-4xl font-display uppercase italic">{sections[activeTab].title}</h2>
                </div>

                <div className="grid gap-8">
                  {sections[activeTab].steps.map((step: any) => (
                    <div key={step.step} className="flex gap-6 items-start group">
                      <div className="flex-shrink-0 w-12 h-12 brutal-border border-neon-green flex items-center justify-center text-neon-green font-display text-2xl group-hover:bg-neon-green group-hover:text-brutal-black transition-colors">
                        {step.step}
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-display uppercase italic text-white">{step.title}</h3>
                        <p className="text-gallery-white/60 font-mono text-sm leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Quick Tips */}
          <div className="bg-yellow-400/10 brutal-border border-yellow-400 p-8">
            <h3 className="text-2xl font-display uppercase italic text-yellow-400 mb-4 flex items-center gap-2">
              💡 Pro Tips
            </h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                "Create a username to earn coins and appear on leaderboards",
                "Share your roasts on social media to earn extra coins",
                "Complete daily challenges to build your streak",
                "Invite friends using your referral link to earn bonus coins"
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-3 font-mono text-xs text-gallery-white/70 uppercase">
                  <span className="text-yellow-400">⚡</span> {tip}
                </li>
              ))}
            </ul>
          </div>

          <footer className="pt-12 border-t-2 border-gallery-white/10 text-center">
            <Link to="/" className="inline-block brutal-btn bg-neon-green text-brutal-black px-12 py-4 text-xl">
              START ROASTING NOW 🔥
            </Link>
          </footer>
        </motion.div>
      </main>
    </div>
  );
}
