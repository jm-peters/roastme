import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Cookie } from 'lucide-react';

export default function CookiePolicyPage() {
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
            <h1 className="text-6xl md:text-8xl font-display uppercase leading-none">Cookie Policy</h1>
            <p className="font-mono text-neon-green mt-4 uppercase tracking-[0.2em]">Last updated: April 2026</p>
          </header>

          <section className="space-y-6">
            <div className="brutal-border p-8 bg-gallery-white/5">
              <h2 className="text-3xl font-display uppercase text-neon-green mb-6 flex items-center gap-3">
                <Cookie className="w-8 h-8" /> What Are Cookies?
              </h2>
              <p className="text-gallery-white/70 leading-relaxed">
                Cookies are small text files stored on your device when you visit websites. They help 
                websites function properly, remember your preferences, and provide analytics.
              </p>
            </div>

            <div className="brutal-border p-8 bg-gallery-white/5">
              <h2 className="text-3xl font-display uppercase text-neon-green mb-6">Cookies We Use</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs uppercase tracking-widest">
                  <thead className="text-gallery-white/40 border-b border-gallery-white/10">
                    <tr>
                      <th className="py-4">Cookie Name</th>
                      <th className="py-4">Purpose</th>
                      <th className="py-4">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="text-gallery-white/70">
                    <tr className="border-b border-gallery-white/5">
                      <td className="py-4">auth_token</td>
                      <td className="py-4">Authentication & session management</td>
                      <td className="py-4">30 days</td>
                    </tr>
                    <tr className="border-b border-gallery-white/5">
                      <td className="py-4">roast_session_id</td>
                      <td className="py-4">Anonymous user tracking for features</td>
                      <td className="py-4">1 year</td>
                    </tr>
                    <tr className="border-b border-gallery-white/5">
                      <td className="py-4">next-auth.session-token</td>
                      <td className="py-4">NextAuth authentication</td>
                      <td className="py-4">30 days</td>
                    </tr>
                    <tr>
                      <td className="py-4">notifications_enabled</td>
                      <td className="py-4">User preference for notifications</td>
                      <td className="py-4">Persistent</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="brutal-border p-8 bg-gallery-white/5">
              <h2 className="text-3xl font-display uppercase text-neon-green mb-6">Third-Party Cookies</h2>
              <p className="text-gallery-white/70 leading-relaxed">
                RoastMe uses minimal third-party cookies for analytics only (PostHog). We do not use 
                advertising cookies or tracking pixels. Social sharing buttons may set cookies from 
                WhatsApp, X (Twitter), and Instagram when you interact with them.
              </p>
            </div>

            <div className="brutal-border p-8 bg-gallery-white/5">
              <h2 className="text-3xl font-display uppercase text-neon-green mb-6">Managing Cookies</h2>
              <p className="text-gallery-white/70 leading-relaxed mb-4">
                You can control cookies through your browser settings. Disabling cookies may affect 
                functionality:
              </p>
              <ul className="list-disc list-inside text-gallery-white/70 space-y-2 ml-4">
                <li>You may need to log in more frequently</li>
                <li>Anonymous features may be limited</li>
                <li>Your session preferences won't be saved</li>
              </ul>
            </div>

            <div className="brutal-border p-8 bg-gallery-white/5">
              <h2 className="text-3xl font-display uppercase text-neon-green mb-6">Contact</h2>
              <p className="text-gallery-white/70 leading-relaxed">
                For cookie-related questions: <span className="text-neon-green">privacy@roastme.site</span>
              </p>
            </div>
          </section>

          <footer className="pt-12 border-t-2 border-gallery-white/10 text-center">
            <Link to="/" className="inline-block brutal-btn bg-neon-green text-brutal-black px-12 py-4 text-xl">
              BACK TO ROASTING
            </Link>
          </footer>
        </motion.div>
      </main>
    </div>
  );
}
