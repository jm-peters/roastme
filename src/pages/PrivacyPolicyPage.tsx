import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Mail, Eye, Database, Globe, UserCheck, Camera } from 'lucide-react';

export default function PrivacyPolicyPage() {
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
            <h1 className="text-6xl md:text-8xl font-display uppercase leading-none">Privacy Policy</h1>
            <p className="font-mono text-neon-green mt-4 uppercase tracking-[0.2em]">Last Updated: April 2026</p>
          </header>

          <section className="space-y-8">
            <div className="brutal-border p-8 bg-gallery-white/5">
              <h2 className="text-3xl font-display uppercase text-neon-green mb-6 flex items-center gap-3">
                <Eye className="w-8 h-8" /> 1. Information We Collect
              </h2>
              <ul className="list-disc list-inside text-gallery-white/60 space-y-3 font-mono text-xs uppercase tracking-widest ml-4">
                <li><span className="text-white">Account Information:</span> Username, email (optional), and hashed password</li>
                <li><span className="text-white">Profile Information:</span> Bio, avatar URL, and Roastboard preferences</li>
                <li><span className="text-white">Usage Data:</span> Roasts created, reactions, shares, battles participated in</li>
                <li><span className="text-white">Device Information:</span> IP address, browser type, device type (for analytics)</li>
                <li><span className="text-white">Photos:</span> Images uploaded for roasts and pranks (stored temporarily for max 24 hours)</li>
              </ul>
            </div>

            <div className="brutal-border p-8 bg-gallery-white/5">
              <h2 className="text-3xl font-display uppercase text-neon-green mb-6 flex items-center gap-3">
                <Camera className="w-8 h-8" /> Prank Photo Privacy
              </h2>
              <p className="text-gallery-white/70 leading-relaxed mb-4">
                When you upload a photo for a prank link:
              </p>
              <ul className="list-disc list-inside text-gallery-white/60 space-y-2 font-mono text-xs uppercase tracking-widest ml-4">
                <li>Images are stored temporarily for a maximum of 24 hours</li>
                <li>Photos are automatically and permanently deleted after expiration</li>
                <li>We do not share or use these images for any other purpose</li>
                <li>Maximum file size is restricted to 2MB</li>
              </ul>
            </div>

            <div className="brutal-border p-8 bg-gallery-white/5">
              <h2 className="text-3xl font-display uppercase text-neon-green mb-6">2. How We Use Your Information</h2>
              <ul className="list-disc list-inside text-gallery-white/60 space-y-3 font-mono text-xs uppercase tracking-widest ml-4">
                <li>Generate system-powered roasts based on your uploaded photos</li>
                <li>Operate and improve the Roast Feed, Battle Mode, and Challenges</li>
                <li><span className="text-white">Reward Economy:</span> Track engagement metrics to award Coins and RMP points</li>
                <li><span className="text-white">Payout Processing:</span> Verify identity and process withdrawal requests safely</li>
                <li>Display leaderboards and user rankings</li>
                <li>Prevent abuse, spam, and policy violations</li>
                <li>Analyze usage patterns to improve the platform</li>
              </ul>
            </div>

            <div className="brutal-border p-8 bg-gallery-white/5">
              <h2 className="text-3xl font-display uppercase text-neon-green mb-6 flex items-center gap-3">
                <ShieldCheck className="w-8 h-8" /> 3. Anonymous Messaging Privacy
              </h2>
              <p className="text-gallery-white/70 leading-relaxed mb-4">
                Anonymous messages are sent with complete privacy. We do not:
              </p>
              <ul className="list-disc list-inside text-gallery-white/60 space-y-2 font-mono text-xs uppercase tracking-widest ml-4">
                <li>Store IP addresses of message senders</li>
                <li>Track identifying information of anonymous senders</li>
                <li>Store message content beyond delivery to recipient</li>
              </ul>
              <p className="text-gallery-white/40 font-mono text-[10px] mt-4 uppercase tracking-widest">
                Messages auto-delete after 30 days. This feature is designed for fun, constructive feedback — not harassment.
              </p>
            </div>

            <div className="brutal-border p-8 bg-gallery-white/5">
              <h2 className="text-3xl font-display uppercase text-neon-green mb-6 flex items-center gap-3">
                <Database className="w-8 h-8" /> 4. Data Storage & Security
              </h2>
              <p className="text-gallery-white/70 leading-relaxed">
                Your data is stored on secure servers with encryption at rest. Passwords are hashed using bcrypt. 
                Session tokens are stored in HTTP-only cookies. We use rate limiting and input validation to 
                protect against attacks. While we take security seriously, no method of transmission is 100% secure.
              </p>
            </div>

            <div className="brutal-border p-8 bg-gallery-white/5">
              <h2 className="text-3xl font-display uppercase text-neon-green mb-6">5. Cookies & Tracking</h2>
              <p className="text-gallery-white/70 leading-relaxed">
                RoastMe uses essential cookies for authentication and session management. We do not use 
                third-party tracking cookies for advertising. Analytics are collected via PostHog to improve 
                the platform. You can disable cookies in your browser, but some features may not work properly.
              </p>
            </div>

            <div className="brutal-border p-8 bg-gallery-white/5">
              <h2 className="text-3xl font-display uppercase text-neon-green mb-6 flex items-center gap-3">
                <Globe className="w-8 h-8" /> 6. Third-Party Services
              </h2>
              <p className="text-gallery-white/70 leading-relaxed mb-4">
                RoastMe integrates with the following third-party services:
              </p>
              <ul className="list-disc list-inside text-gallery-white/60 space-y-2 font-mono text-xs uppercase tracking-widest ml-4">
                <li><span className="text-white">External Service:</span> For roast generation (photos are processed temporarily)</li>
                <li><span className="text-white">PostHog:</span> For product analytics</li>
                <li><span className="text-white">Google Cloud:</span> For database hosting</li>
                <li><span className="text-white">Vercel:</span> For application hosting</li>
              </ul>
            </div>

            <div className="brutal-border p-8 bg-gallery-white/5">
              <h2 className="text-3xl font-display uppercase text-neon-green mb-6 flex items-center gap-3">
                <UserCheck className="w-8 h-8" /> 7. Your Rights & Control
              </h2>
              <ul className="list-disc list-inside text-gallery-white/60 space-y-2 font-mono text-xs uppercase tracking-widest ml-4">
                <li>Access all data associated with your account</li>
                <li>Correct or update your profile information</li>
                <li>Delete your account and all associated data (via Settings)</li>
                <li>Opt out of analytics tracking (via browser settings)</li>
                <li>Disable notifications at any time</li>
              </ul>
            </div>

            <div className="brutal-border p-8 bg-gallery-white/5">
              <h2 className="text-3xl font-display uppercase text-neon-green mb-6">8. Data Retention</h2>
              <p className="text-gallery-white/70 leading-relaxed">
                Account data is retained as long as your account is active. Upon account deletion, all 
                personal data is permanently removed within 30 days. Anonymous messages auto-delete after 
                30 days. Roast feed content may be retained for platform continuity but is anonymized.
              </p>
            </div>

            <div className="brutal-border p-8 bg-gallery-white/5">
              <h2 className="text-3xl font-display uppercase text-neon-green mb-6">9. Children's Privacy</h2>
              <p className="text-gallery-white/70 leading-relaxed">
                RoastMe is not intended for children under 13 years of age. We do not knowingly collect 
                personal information from children under 13. If you believe a child has provided us with 
                personal information, please contact us to have it removed.
              </p>
            </div>

            <div className="brutal-border p-8 bg-gallery-white/5">
              <h2 className="text-3xl font-display uppercase text-neon-green mb-6 flex items-center gap-3">
                <Mail className="w-8 h-8" /> 10. Contact Us
              </h2>
              <p className="text-gallery-white/70 leading-relaxed mb-4">
                For privacy concerns or data requests, contact:
              </p>
              <div className="text-neon-green font-mono text-xl">privacy@roastme.site</div>
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
