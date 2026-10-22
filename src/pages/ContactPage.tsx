import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, MessageSquare, AlertTriangle } from 'lucide-react';

export default function ContactPage() {
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
            <h1 className="text-6xl md:text-8xl font-display uppercase leading-none">Contact Us</h1>
            <p className="font-mono text-neon-green mt-4 uppercase tracking-[0.2em]">We're listening (mostly). 🔥</p>
          </header>

          <section className="space-y-6">
            <p className="text-xl md:text-2xl font-medium leading-relaxed">
              Thank you for visiting RoastMe.site.
            </p>
            <p className="text-gallery-white/70 leading-relaxed">
              If you have any questions, feedback, suggestions, or concerns about the website, feel free to get in touch with us. We value your input and are always looking for ways to improve the experience for everyone.
            </p>
          </section>

          <div className="grid md:grid-cols-1 gap-8">
            <div className="brutal-border p-8 bg-gallery-white/5 flex flex-col md:flex-row gap-8 items-start">
              <div className="p-4 bg-blue-500/20 brutal-border border-blue-500">
                <Mail className="w-8 h-8 text-blue-500" />
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-display uppercase">General Inquiries</h2>
                <p className="text-gallery-white/70 leading-relaxed">
                  For general questions or support, you can contact us via email:
                </p>
                <p className="text-2xl font-mono text-neon-green break-all">support@roastme.site</p>
              </div>
            </div>

            <div className="brutal-border p-8 bg-gallery-white/5 flex flex-col md:flex-row gap-8 items-start">
              <div className="p-4 bg-purple-500/20 brutal-border border-purple-500">
                <MessageSquare className="w-8 h-8 text-purple-500" />
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-display uppercase">Feedback & Suggestions</h2>
                <p className="text-gallery-white/70 leading-relaxed">
                  Have an idea to make RoastMe.site more fun or improve our roasting experience? We'd love to hear from you. Send us your thoughts and suggestions anytime.
                </p>
              </div>
            </div>

            <div className="brutal-border p-8 bg-gallery-white/5 flex flex-col md:flex-row gap-8 items-start">
              <div className="p-4 bg-red-500/20 brutal-border border-red-500">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-display uppercase">Report an Issue</h2>
                <p className="text-gallery-white/70 leading-relaxed">
                  If you notice a bug, inappropriate content, or something that isn't working correctly, please let us know so we can fix it as soon as possible.
                </p>
              </div>
            </div>
          </div>

          <section className="bg-neon-green/10 brutal-border border-neon-green p-8 text-center">
            <p className="text-lg font-mono uppercase tracking-widest">
              We aim to respond to most messages within 24–48 hours.
            </p>
          </section>

          <footer className="pt-12 border-t-2 border-gallery-white/10 text-center">
            <p className="text-xl font-display uppercase">
              Thank you for being part of RoastMe.site.
            </p>
            <Link to="/" className="inline-block mt-8 brutal-btn bg-neon-green text-brutal-black px-12 py-4 text-xl">
              BACK TO THE HEAT
            </Link>
          </footer>
        </motion.div>
      </main>
    </div>
  );
}
