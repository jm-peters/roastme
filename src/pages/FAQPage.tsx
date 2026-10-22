import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowLeft, HelpCircle, ChevronDown } from 'lucide-react';
import { useState } from 'react';

const faqs = [
  {
    question: "What is RoastMe.site?",
    answer: "RoastMe.site is an entertainment website that generates humorous roasts based on text you submit. It’s designed to make people laugh with witty and playful insults."
  },
  {
    question: "Are the roasts meant to be offensive?",
    answer: "No. The roasts are intended for entertainment and humor only. They should not be taken personally or used to harm others."
  },
  {
    question: "Do I need to create an account?",
    answer: "No. You can use RoastMe.site instantly without creating an account or signing up."
  },
  {
    question: "Is my information stored?",
    answer: "We do not require personal information to use the site. Any text you enter is used only to generate the roast."
  },
  {
    question: "Can I roast my friends?",
    answer: "Yes! You can enter your friend's name or a description to generate a roast. Just remember to keep it friendly and fun."
  },
  {
    question: "Is the website free to use?",
    answer: "Yes. RoastMe.site is free to use."
  },
  {
    question: "Why didn't I get a roast?",
    answer: "Sometimes there may be technical issues or the input may not be processed correctly. Try refreshing the page and submitting again."
  },
  {
    question: "Who should use this website?",
    answer: "Anyone who enjoys humor, jokes, and playful roasting. However, users should understand that roasts are part of comedy and should not be taken seriously."
  }
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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
            <h1 className="text-6xl md:text-8xl font-display uppercase leading-none">FAQ</h1>
            <p className="font-mono text-neon-green mt-4 uppercase tracking-[0.2em]">Got questions? We've got burns. 🔥</p>
          </header>

          <section className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="brutal-border bg-gallery-white/5 overflow-hidden">
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full p-6 text-left flex justify-between items-center hover:bg-gallery-white/10 transition-colors"
                >
                  <span className="text-xl font-display uppercase">{faq.question}</span>
                  <ChevronDown className={`w-6 h-6 text-neon-green transition-transform ${openIndex === index ? 'rotate-180' : ''}`} />
                </button>
                <div className={`transition-all duration-300 ${openIndex === index ? 'max-h-96 p-6 pt-0 border-t border-gallery-white/10' : 'max-h-0'}`}>
                  <p className="text-gallery-white/70 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            ))}
          </section>

          <footer className="pt-12 border-t-2 border-gallery-white/10 text-center">
            <p className="text-gallery-white/50 mb-8">Still have questions? Reach out to support@roastme.site</p>
            <Link to="/" className="inline-block brutal-btn bg-neon-green text-brutal-black px-12 py-4 text-xl">
              GET ROASTED NOW
            </Link>
          </footer>
        </motion.div>
      </main>
    </div>
  );
}
