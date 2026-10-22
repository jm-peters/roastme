import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Flame } from 'lucide-react';

export default function AboutPage() {
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

      <main className="max-w-3xl mx-auto p-6 py-16">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="space-y-12"
        >
          <header className="border-b-4 border-neon-green pb-8">
            <h1 className="text-6xl md:text-8xl font-display uppercase leading-none">About ROAST ME</h1>
            <p className="font-mono text-neon-green mt-4 uppercase tracking-[0.2em]">Where humor meets the heat 🔥</p>
          </header>

          <section className="space-y-6">
            <p className="text-xl md:text-2xl font-medium leading-relaxed">
              Welcome to ROAST ME — the place where humor, creativity, and a little bit of savage fun come together.
            </p>
            <p className="text-gallery-white/70 leading-relaxed">
              ROAST ME is a simple platform designed for people who enjoy witty comebacks, playful insults, and clever roasting. Whether you're here to laugh at yourself, roast your friends, or just see how sharp the internet can be, this site is built to deliver quick, funny, and sometimes brutally honest roasts.
            </p>
          </section>

          <section className="brutal-border p-8 bg-neon-green/10 border-neon-green">
            <h2 className="text-3xl font-display uppercase mb-6 text-neon-green flex items-center gap-3">
              <span className="bg-neon-green text-brutal-black px-2">RMP</span> REWARD SYSTEM
            </h2>
            <p className="text-gallery-white/80 mb-6 font-medium">
              We reward our most active roasters with Roast Me Points (RMP). The more you engage, the more you earn! 
              RMP is automatically converted into Roast Coins which can be used to unlock premium features.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-sm">
              <div className="flex flex-col bg-brutal-black/50 p-4 border border-gallery-white/10 group hover:border-neon-green transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gallery-white/60">Daily Login</span>
                  <span className="text-neon-green">+2000 RMP</span>
                </div>
                <p className="text-[10px] text-gallery-white/30 uppercase">Claim your daily streak bonus for even more rewards!</p>
              </div>
              
              <div className="flex flex-col bg-brutal-black/50 p-4 border border-gallery-white/10 group hover:border-neon-green transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gallery-white/60">First Roast</span>
                  <span className="text-neon-green">+500 RMP</span>
                </div>
                <p className="text-[10px] text-gallery-white/30 uppercase">Earn big for your first roast of the day.</p>
              </div>

              <div className="flex flex-col bg-brutal-black/50 p-4 border border-gallery-white/10 group hover:border-neon-green transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gallery-white/60">Challenge Win</span>
                  <span className="text-neon-green">+500 RMP</span>
                </div>
                <p className="text-[10px] text-gallery-white/30 uppercase">Top the leaderboard in friendship and truth or dare challenges.</p>
              </div>

              <div className="flex flex-col bg-brutal-black/50 p-4 border border-gallery-white/10 group hover:border-neon-green transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gallery-white/60">Time Spent</span>
                  <span className="text-neon-green">+100 RMP/min</span>
                </div>
                <p className="text-[10px] text-gallery-white/30 uppercase">Get rewarded just for hanging out and reading roasts.</p>
              </div>
            </div>

            <div className="mt-8 space-y-4 border-t border-gallery-white/10 pt-6">
              <h3 className="text-xl font-display uppercase text-gallery-white">Coming Soon: Cash Out</h3>
              <p className="text-sm text-gallery-white/60">
                Turn your Roast Coins into real-world rewards. Our upcoming marketplace will allow you to redeem coins 
                for gift cards, premium subscriptions, and exclusive merchandise.
              </p>
            </div>

            <p className="mt-6 text-xs text-gallery-white/40 uppercase tracking-widest italic">
              * RMP conversion rate: 100 RMP = 1 Roast Coin. Earn rewards through active participation.
            </p>
          </section>

          <section className="grid md:grid-cols-2 gap-8">
            <div className="brutal-border p-8 bg-gallery-white/5">
              <h2 className="text-2xl font-display uppercase mb-4 text-neon-green">What We Do</h2>
              <p className="text-sm text-gallery-white/70 leading-relaxed">
                At ROAST ME, you can enter text, a name, or a short description and receive a humorous roast instantly. The goal is entertainment — not harm. Our system generates jokes and playful insults meant to make people laugh and enjoy the moment.
              </p>
            </div>
            <div className="brutal-border p-8 bg-gallery-white/5">
              <h2 className="text-2xl font-display uppercase mb-4 text-neon-green">Our Mission</h2>
              <p className="text-sm text-gallery-white/70 leading-relaxed">
                Our mission is to create a fun space on the internet where people can enjoy humor without taking things too seriously. Roasting has always been part of comedy culture, and we aim to bring that tradition into a quick, modern, and interactive experience.
              </p>
            </div>
          </section>

          <section className="bg-red-900/20 brutal-border border-red-500 p-8">
            <h2 className="text-2xl font-display uppercase mb-4 text-red-500">Important Note</h2>
            <p className="text-gallery-white/80 italic">
              Roasts on this website are meant purely for entertainment. They should not be taken personally or used to hurt others. We encourage users to enjoy the jokes responsibly and respectfully.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-3xl font-display uppercase">Contact</h2>
            <p className="text-gallery-white/70">
              If you have feedback, suggestions, or questions, feel free to reach out. We're always looking for ways to improve the experience and make ROAST ME even more fun.
            </p>
          </section>

          <footer className="pt-12 border-t-2 border-gallery-white/10 text-center">
            <p className="text-xl font-display uppercase">
              Thanks for visiting ROAST ME — and remember, if you ask for a roast… be ready to get burned 🔥.
            </p>
            <Link to="/" className="inline-block mt-8 brutal-btn bg-neon-green text-brutal-black px-12 py-4 text-xl">
              GET ROASTED NOW
            </Link>
          </footer>
        </motion.div>
      </main>
    </div>
  );
}
