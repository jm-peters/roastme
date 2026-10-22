// src/utils/geminiRoastGenerator.ts
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';

// Initialize Gemini API lazily
let aiInstance: GoogleGenAI | null = null;

function getAI() {
  const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "AQ.Ab8RN6KCopmsqXal-ugQ5RRhNYvepNfig_wbvCLynyacrc5F_A";
  if (!key || key === 'MY_GEMINI_API_KEY' || key === 'missing_key' || key.trim() === '') {
    return null;
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: key });
  }
  return aiInstance;
}

export interface GeminiRoastParams {
  target: string;
  targetDescription?: string;
  intensity: 'mild' | 'medium' | 'brutal';
  roastType: 'comeback' | 'self_deprecating' | 'challenge' | 'existential';
  languageComplexity: 'simple' | 'standard' | 'complex';
  theme?: string;
}

// Premium local fallback roasts (used when Gemini API is unavailable)
const localFallbackRoasts = {
  mild: {
    comeback: [
      `@{target} has the confidence of a toddler who just discovered a light switch—cute but ultimately useless.`,
      `@{target} walks around like they're the main character in a movie that went straight to DVD.`,
      `@{target} brings the energy of a deflated balloon at a child's birthday party—present but completely unnecessary.`,
      `@{target} thinks they're the final boss, but they're really just the tutorial level nobody asked for.`,
      `@{target} has the personality of a default ringtone—annoying and impossible to change.`,
      `@{target} is the human equivalent of a typo in an otherwise good sentence.`
    ],
    challenge: [
      `@{target} talks like Google but searches like Internet Explorer—slow and outdated.`,
      `@{target} couldn't roast a marshmallow, let alone another human being.`,
      `@{target} has the roasting skills of a microwave—lukewarm and disappointing.`,
      `@{target} thinks they're spicy, but they're really just unseasoned chicken.`,
      `I've seen more intimidating challenges on the back of a cereal box, @{target}.`
    ],
    self_deprecating: [
      `@{target} and I are both proof that even God has a sense of humor—and it's dark.`,
      `I'd roast @{target}, but my mirror already does that job every morning.`,
      `@{target} and I are like two wrongs trying to make a right—it's not working.`,
      `I'm barely holding it together, but next to @{target}, I look like a life coach.`
    ],
    existential: [
      `@{target} is what happens when mediocrity peaks and refuses to leave.`,
      `Somewhere in the universe, a black hole is pulling energy away from @{target}'s charisma.`,
      `@{target} is living proof that anyone can make it in this world—and that's not a compliment.`,
      `I sometimes wonder about the universe, then I see @{target} and realize it's all just random.`
    ]
  },
  medium: {
    comeback: [
      `@{target} has the charm of a spam email and the wit of a captcha test.`,
      `@{target} walks around like their opinion matters in a world that's already muted them.`,
      `@{target} brings so little to the table, the table's embarrassed to have legs.`,
      `@{target} is the human equivalent of a low-battery notification—annoying and constantly draining.`,
      `@{target} talks like they have a PhD in nonsense from the University of Irrelevant Opinions.`,
      `@{target}'s vibe is like a pop-up ad that you can't find the 'X' for.`
    ],
    challenge: [
      `@{target} couldn't win a roast battle against a deaf mute with no sense of humor.`,
      `@{target} talks trash like they're allergic to good decisions and fresh air.`,
      `@{target} thinks they're a 10, but even their reflection gives them a pity discount.`,
      `@{target} has the confidence of someone who's never been told the truth—and it shows.`,
      `Bring it on, @{target}. Defeating you is just another side quest I didn't want.`
    ],
    self_deprecating: [
      `@{target} and I are both proof that evolution can sometimes go backward for a whole generation.`,
      `I'd roast @{target}, but the mirror would crack from the reflection—and we can't afford that.`,
      `@{target} and I are like two expired coupons—completely useless but still taking up space.`,
      `I might be a walking disaster, but @{target} is the whole catastrophic event.`
    ],
    existential: [
      `@{target} is the reason aliens drive past our solar system and lock their doors.`,
      `@{target}'s birth certificate is an apology letter from the hospital to the entire human race.`,
      `The universe expanded for 13.8 billion years just to create @{target}, and honestly? It was a waste.`,
      `I look at @{target} and suddenly understand why the dinosaurs decided to just give up.`
    ]
  },
  brutal: {
    comeback: [
      `@{target} looks like they were drawn from memory by someone who's never seen a human.`,
      `@{target} has a face that could make an onion cry and then apologize for crying.`,
      `@{target} is the human equivalent of a participation trophy—nobody asked for it, and nobody wants it.`,
      `@{target} walks around like they're God's gift to humanity, but even God returned the receipt.`,
      `@{target} has the charisma of a wet sock and the intelligence of a broken calculator.`,
      `@{target} is what you get when you order a personality off Wish.com.`
    ],
    challenge: [
      `@{target} couldn't roast a chicken in a microwave, let alone another person.`,
      `@{target} talks like they're the CEO of being wrong, and business is booming.`,
      `@{target} thinks they're a legend, but even myths have better credibility.`,
      `@{target} has the roasting skills of a toaster—only good for burning things by accident.`,
      `Step into the ring, @{target}. I've been looking for a warm-up dummy.`
    ],
    self_deprecating: [
      `@{target} and I are both mistakes, but at least I admit it.`,
      `I'd say @{target} is ugly, but that would be an insult to ugly people everywhere.`,
      `@{target} and I are the reason some families don't talk during holidays.`,
      `I'm a sinking ship, and somehow @{target} is the anchor dragging me to rock bottom.`
    ],
    existential: [
      `@{target} is the reason aliens won't visit Earth—they're afraid of catching secondhand embarrassment.`,
      `@{target}'s existence is the strongest argument for atheism I've ever seen.`,
      `The universe created @{target} as a social experiment to see how much disappointment one person can cause.`,
      `@{target} is what happens when God runs out of ideas and just starts hitting random buttons.`,
      `Generations from now, historians will study @{target} as the moment human progression stopped.`
    ]
  }
};

// Dynamic elements for fallback roasts
const dynamicOpeners = [
  "Brace yourself...", "Hold onto your ego...", "I'm about to hurt your feelings...",
  "Sit down for this...", "Don't say I didn't warn you...", "Here we go...",
  "Logically speaking...", "Statistically speaking...", "In the grand scheme of things...",
  "Let's be honest here...", "Truth is...", "Ngl...", "Deadass...",
  "I'm just saying...", "Facts are facts...", "Real talk..."
];

const dynamicClosers = [
  "💀", "🔥", "😭", "🫣", "📸", "👀", "💀💀💀", "🔥🔥🔥", "😭😭😭", "💀🔥", "😭💀",
  "You asked for this.", "Don't hate the player.", "Better luck next time.",
  "Facts don't care about your feelings.", "Just saying.", "Roasted.",
  "And that's on period.", "No cap.", "Deadass.", "Period.", "Case closed.",
  "Sit down.", "Next!", "Mic drop.", "🚮", "🗑️", "🥱"
];

function getDynamicOpener(): string {
  return dynamicOpeners[Math.floor(Math.random() * dynamicOpeners.length)];
}

function getDynamicCloser(): string {
  return dynamicClosers[Math.floor(Math.random() * dynamicClosers.length)];
}

export async function generateGeminiRoast(params: GeminiRoastParams): Promise<string | null> {
  const { target, targetDescription, intensity, roastType, languageComplexity, theme } = params;
  
  // Get the AI instance
  const ai = getAI();
  if (!ai) {
    console.log('Gemini API key not configured or placeholder detected, using fallback');
    return null;
  }
  
  // Intensity descriptions for the AI - Refined for distinct vibes but safer
  const intensityMap = {
    mild: "clever, dry, and slightly mischievous. Use playful irony and 'roommate-level' teasing.",
    medium: "observational, sharp, and witty. Use creative metaphors and internet-culture humor.",
    brutal: "devastatingly articulate, brutally honest but humorous. Focus on hyper-exaggerated aesthetic and personality traits without crossing into actual harassment."
  };
  
  // Roast type descriptions
  const roastTypeMap = {
    comeback: "a clever comeback that completely dismisses their perceived coolness",
    self_deprecating: "a roast that insults them while also hilariously insulting yourself in the process",
    challenge: "a provocative, funny dare that establishes your superiority in wit",
    existential: "a hilarious philosophical dive into how funny their life choices are in the grand scheme of the universe"
  };
  
  // Language complexity
  const complexityMap = {
    simple: "Use casual internet slang and short, punchy sentences.",
    standard: "Use standard witty conversation. Mix common humor with good punchlines.",
    complex: "Use sophisticated metaphors, elevated vocabulary, and hyper-specific observations."
  };
  
  // Build user context for personalization
  let userContext = `Target: ${target}.`;
  
  if (theme && theme.trim().length > 0) {
    userContext += ` Theme to focus on: ${theme}.`;
  }
  
  if (targetDescription && targetDescription !== 'someone' && targetDescription.length > 3) {
    userContext += ` Extra context about them: ${targetDescription}.`;
  }
  
  // Build the prompt for Gemini
  const prompt = `Persona: You are a sharp, hilarious comedy writer specializing in incredible custom roasts. Your roasts are deeply creative, surprising, and very funny.

Task: Create a ${intensityMap[intensity]} ${roastTypeMap[roastType]}.

Target Information: ${userContext}

Rules for Generation:
1. Be highly original. NO clichés (avoid basic jokes).
2. Use specific, creative, and absurd metaphors.
3. Keep it purely comedic. Avoid genuine hate speech, real threats, or severe harassment. Focus on absurdity.
4. NO DISCLAIMERS. DO NOT EVER say "(just kidding)", "no offense", or apologize.
5. NO introductory text. Generate ONLY the roast.

Technical Specs:
- Length: 2-3 sentences max.
- Language Level: ${complexityMap[languageComplexity]}
- Tone: Extremely witty, sassy, and humorous.
- Must include: 1-2 modern emojis (💀, 🔥, 😭, 📉, 🤡).

Output: ONLY the raw roast text.`;

  try {
    const ai = getAI();
    if (!ai) return null;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.9,
        topP: 0.95,
        topK: 40,
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          }
        ],
      },
    });

    let geminiRoast = response.text || '';
    geminiRoast = geminiRoast.trim();
    
    if (!geminiRoast || geminiRoast.length < 10) return null;
    
    // Clean up the response
    geminiRoast = geminiRoast.replace(/^["']|["']$/g, '');
    geminiRoast = geminiRoast.replace(/^Here's a roast: /i, '');
    geminiRoast = geminiRoast.replace(/^Roast: /i, '');
    
    // Ensure it has an emoji if missing
    if (!/[💀🔥😭🫣📸👀🥱🚮🗑️🤡📉]/.test(geminiRoast)) {
      const emojis = ['💀', '🔥', '😭', '💀🔥', '😭💀'];
      geminiRoast += ` ${emojis[Math.floor(Math.random() * emojis.length)]}`;
    }
    
    // Ensure it's not too long
    if (geminiRoast.length > 500) {
      geminiRoast = geminiRoast.substring(0, 497) + '...';
    }
    
    return geminiRoast;
    
  } catch (error: any) {
    console.error('Gemini roast generation failed:', error?.message || error);
    // Print full error object for debugging
    if (error?.status) console.error('Status:', error.status);
    return null;
  }
}

export function generateFallbackRoast(params: GeminiRoastParams): string {
  const { target, intensity, roastType } = params;
  
  // Get base roast from local fallback
  const intensityRoasts = localFallbackRoasts[intensity];
  const typeRoasts = intensityRoasts[roastType as keyof typeof intensityRoasts] || intensityRoasts.comeback;
  let baseRoast = typeRoasts[Math.floor(Math.random() * typeRoasts.length)];
  
  // Replace target placeholder
  baseRoast = baseRoast.replace(/@{target}/g, target);
  
  // Add dynamic opener (40% chance)
  if (Math.random() > 0.6) {
    baseRoast = `${getDynamicOpener()} ${baseRoast}`;
  }
  
  // Add dynamic closer (always for medium/brutal, sometimes for mild)
  if (intensity !== 'mild' || Math.random() > 0.5) {
    baseRoast = `${baseRoast} ${getDynamicCloser()}`;
  }
  
  return baseRoast;
}

export async function getRoast(params: GeminiRoastParams): Promise<{ roast: string; source: 'gemini' | 'fallback' }> {
  // Try Gemini AI first
  const geminiRoast = await generateGeminiRoast(params);
  
  if (geminiRoast && geminiRoast.length > 10) {
    return { roast: geminiRoast, source: 'gemini' };
  }
  
  // Fallback to local roasts
  return { roast: generateFallbackRoast(params), source: 'fallback' };
}

