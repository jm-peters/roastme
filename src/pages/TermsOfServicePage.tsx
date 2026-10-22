import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Scale, ShieldAlert, Coins, Ghost, Lock } from 'lucide-react';

export default function TermsOfServicePage() {
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
            <h1 className="text-6xl md:text-8xl font-display uppercase leading-none">Terms of Service</h1>
            <p className="font-mono text-neon-green mt-4 uppercase tracking-[0.2em]">Last Updated: April 2026</p>
          </header>

          <section className="space-y-8">
            <div className="brutal-border p-8 bg-gallery-white/5">
              <h2 className="text-3xl font-display uppercase text-neon-green mb-6 flex items-center gap-3">
                <Scale className="w-8 h-8" /> 1. Acceptance of Terms
              </h2>
              <p className="text-gallery-white/70 leading-relaxed">
                By accessing or using RoastMe ("the App"), you agree to be bound by these Terms of Service. 
                If you disagree with any part of the terms, you may not access the Service.
              </p>
            </div>

            <div className="brutal-border p-8 bg-gallery-white/5">
              <h2 className="text-3xl font-display uppercase text-neon-green mb-6">2. Description of Service</h2>
              <p className="text-gallery-white/70 leading-relaxed">
                RoastMe is a social entertainment platform that provides system-generated roast content, 
                friendship challenges, truth or dare games, anonymous messaging, and prank link generation. 
                Users can create, share, and interact with content in a fun, community-driven environment.
              </p>
            </div>

            <div className="brutal-border p-8 bg-gallery-white/5">
              <h2 className="text-3xl font-display uppercase text-neon-green mb-6 flex items-center gap-3">
                <Lock className="w-8 h-8" /> 3. User Accounts & Roastboards
              </h2>
              <p className="text-gallery-white/70 leading-relaxed">
                Users may create a Roastboard by registering a unique username. You are responsible for 
                maintaining the confidentiality of your account. You agree to accept responsibility for 
                all activities that occur under your account. Usernames must not be offensive, impersonate 
                others, or violate any third-party rights.
              </p>
            </div>

            <div className="brutal-border p-8 bg-gallery-white/5">
              <h2 className="text-3xl font-display uppercase text-neon-green mb-6 flex items-center gap-3">
                <Scale className="w-8 h-8" /> Prank Content Guidelines
              </h2>
              <p className="text-gallery-white/70 leading-relaxed mb-4">
                Users may upload photos for prank creation. All uploaded photos are:
              </p>
              <ul className="list-disc list-inside text-gallery-white/60 space-y-2 font-mono text-xs uppercase tracking-widest ml-4">
                <li>Stored temporarily for a maximum of 24 hours</li>
                <li>Automatically deleted after the expiration period</li>
                <li>Not shared with third parties</li>
                <li>Subject to content moderation policies</li>
              </ul>
              <p className="text-gallery-white/40 font-mono text-[10px] mt-4 uppercase tracking-widest">
                Prohibited content includes explicit images, harassment, or any illegal material. 
                Violations will result in immediate account termination.
              </p>
            </div>

            <div className="brutal-border p-8 bg-gallery-white/5">
              <h2 className="text-3xl font-display uppercase text-neon-green mb-6 flex items-center gap-3">
                <ShieldAlert className="w-8 h-8" /> 4. User Conduct & Content
              </h2>
              <p className="text-gallery-white/70 leading-relaxed mb-4">You agree NOT to:</p>
              <ul className="list-disc list-inside text-gallery-white/60 space-y-2 font-mono text-xs uppercase tracking-widest ml-4">
                <li>Post content that is hateful, harassing, or promotes violence</li>
                <li>Impersonate other users or public figures</li>
                <li>Use the App for any illegal activities</li>
                <li>Attempt to bypass rate limits or abuse the generation system</li>
                <li>Share explicit or NSFW content</li>
                <li>Use anonymous messaging for harassment or spam</li>
              </ul>
            </div>

            <div className="brutal-border p-8 bg-gallery-white/5">
              <h2 className="text-3xl font-display uppercase text-neon-green mb-6 flex items-center gap-3">
                <Coins className="w-8 h-8" /> 5. Virtual Currency & Rewards
              </h2>
              <div className="space-y-4">
                <p className="text-gallery-white/70 leading-relaxed">
                  RoastMe uses a dual-currency reward system consisting of RoastMe Points (RMP) and Coins. 
                  RMP are earned through platform engagement and convert automatically at a rate of 100 RMP = 1 Coin. 
                  Coins represent virtual value that can be redeemed for real-world currency at a rate of 1000 Coins = $1 USD.
                </p>
                <div className="bg-black/40 p-4 border border-neon-green/20 font-mono text-[10px] uppercase tracking-wider space-y-2">
                  <p className="text-neon-green">• Minimum Withdrawal: $10.00 USD (10,000 Coins)</p>
                  <p className="text-neon-green">• Processing Time: Up to 7 Business Days</p>
                  <p className="text-neon-green">• Methods: PayPal, USDT (Crypto), Gift Cards</p>
                </div>
                <p className="text-gallery-white/40 text-xs italic">
                  RoastMe reserves the right to adjust earning rates, conversion ratios, and withdrawal thresholds. 
                  Any attempts to abuse the system (bots, click farms, multiple accounts) will result in immediate 
                  forfeiture of all balances and account termination.
                </p>
              </div>
            </div>

            <div className="brutal-border p-8 bg-gallery-white/5">
              <h2 className="text-3xl font-display uppercase text-neon-green mb-6 flex items-center gap-3">
                <Ghost className="w-8 h-8" /> 6. Anonymous Messaging
              </h2>
              <p className="text-gallery-white/70 leading-relaxed">
                Anonymous messages are sent without tracking IP addresses or identifying information. 
                However, you agree not to use this feature for harassment, threats, or spam. 
                RoastMe reserves the right to monitor and block abusive anonymous messages.
              </p>
            </div>

            <div className="brutal-border p-8 bg-gallery-white/5">
              <h2 className="text-3xl font-display uppercase text-neon-green mb-6">7. Intellectual Property</h2>
              <p className="text-gallery-white/70 leading-relaxed">
                Users retain ownership of the photos they upload. By posting content to the public feed, 
                you grant RoastMe a non-exclusive, royalty-free license to display, distribute, and 
                promote your content within the platform. System-generated roasts are considered derivative 
                content owned by RoastMe.
              </p>
            </div>

            <div className="brutal-border p-8 bg-gallery-white/5">
              <h2 className="text-3xl font-display uppercase text-neon-green mb-6">8. Termination</h2>
              <p className="text-gallery-white/70 leading-relaxed">
                RoastMe reserves the right to suspend or terminate accounts that violate these Terms, 
                engage in abusive behavior, or abuse the reward system. Users may delete their own 
                accounts and associated data at any time through account settings.
              </p>
            </div>

            <div className="brutal-border p-8 bg-gallery-white/5">
              <h2 className="text-3xl font-display uppercase text-neon-green mb-6">9. Disclaimer of Warranties</h2>
              <p className="text-gallery-white/70 leading-relaxed">
                The Service is provided "AS IS" without warranties of any kind. RoastMe does not warrant 
                that the service will be uninterrupted, error-free, or completely secure. System-generated 
                roasts are for entertainment purposes only.
              </p>
            </div>

            <div className="brutal-border p-8 bg-gallery-white/5">
              <h2 className="text-3xl font-display uppercase text-neon-green mb-6">10. Limitation of Liability</h2>
              <p className="text-gallery-white/70 leading-relaxed">
                To the maximum extent permitted by law, RoastMe shall not be liable for any indirect, 
                incidental, special, consequential, or punitive damages resulting from your use of the Service.
              </p>
            </div>

            <div className="brutal-border p-8 bg-gallery-white/5">
              <h2 className="text-3xl font-display uppercase text-neon-green mb-6">11. Changes to Terms</h2>
              <p className="text-gallery-white/70 leading-relaxed">
                RoastMe reserves the right to modify these Terms at any time. Continued use of the Service 
                after changes constitutes acceptance of the modified Terms.
              </p>
            </div>

            <div className="brutal-border p-8 bg-gallery-white/5">
              <h2 className="text-3xl font-display uppercase text-neon-green mb-6">12. Contact Us</h2>
              <p className="text-gallery-white/70 leading-relaxed">
                For questions about these Terms, contact us at: <span className="text-neon-green">legal@roastme.site</span>
              </p>
            </div>
          </section>

          <footer className="pt-12 border-t-2 border-gallery-white/10 text-center">
            <Link to="/" className="inline-block brutal-btn bg-neon-green text-brutal-black px-12 py-4 text-xl">
              I AGREE, LET'S ROAST
            </Link>
          </footer>
        </motion.div>
      </main>
    </div>
  );
}
