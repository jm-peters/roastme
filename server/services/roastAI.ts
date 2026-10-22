// src/services/roastAI.ts
import { GoogleGenAI } from "@google/genai";
import { ROAST_PERSONAS, INTENSITY_MODIFIERS } from "../../src/constants/roastConstants.ts";

export interface RoastPromptParams {
  inputType: 'text' | 'photo' | 'social' | 'mood' | 'jobtitle' | 'random';
  inputContent: string;
  persona: string;
  intensity: string;
  userProfile?: any;
  previousRoasts?: string[];
  sessionCount?: number;
  // v1 Merged Fields
  target?: string;
  targetDescription?: string;
  mode?: 'roast' | 'hype';
  theme?: string;
  roastStyle?: string;
  languageComplexity?: string;
}

export function buildRoastPrompt({
  inputType,
  inputContent,
  persona,
  intensity,
  userProfile,
  previousRoasts = [],
  sessionCount = 0,
  target = 'you',
  targetDescription = '',
  mode = 'roast',
  theme = 'standard',
  roastStyle = 'comeback',
  languageComplexity = 'standard'
}: RoastPromptParams) {
  const personaConfig = (ROAST_PERSONAS as any)[persona] || ROAST_PERSONAS.comedian;
  const intensityConfig = (INTENSITY_MODIFIERS as any)[intensity] || INTENSITY_MODIFIERS.roasted;

  if (mode === 'hype') {
    const systemPrompt = `You are a legendary hype-man. Your goal is to make the user feel like a superhero. 
Be energetic, use hyperbolic praise, and make them feel absolutely invincible. 
Keep it to 2-3 sentences max. Be punchy and high-energy.`;
    const userPrompt = `The user's input/context is: "${inputContent || 'their general presence'}". 
Hype them up and make them feel like the greatest person alive right now.`;
    return { systemPrompt, userPrompt };
  }

  const profileContext = userProfile ? `
USER PROFILE:
- Job/Role: ${userProfile.jobTitle || 'unknown'}
- Hobbies: ${(userProfile.hobbies || []).join(', ') || 'none provided'}
- Biggest habit: ${userProfile.biggestHabit || 'unknown'}
- Relationship status: ${userProfile.relationshipStatus || 'complicated, probably'}
- Last embarrassing thing: ${userProfile.lastEmbarrassingThing || 'their entire existence'}
` : '';

  const memoryContext = previousRoasts.length > 0 ? `
PREVIOUS ROASTS IN THIS SESSION:
${previousRoasts.slice(-2).map((r, i) => `Roast ${i + 1}: "${r.substring(0, 100)}..."`).join('\n')}
${sessionCount > 1 ? `This user keeps coming back for more (${sessionCount} times). Acknowledge their masochism.` : ''}
` : '';

  const inputInstructions = {
    text: `The target is: "${target}". ${targetDescription ? `Context about them: "${targetDescription}".` : ''} 
Input content from or about them: "${inputContent}"`,
    photo: `The user submitted a photo description for roasting. Description/tags: "${inputContent}". Roast their aesthetic, energy, and what this photo says about their personality.`,
    social: `The user pasted their social media bio/post: "${inputContent}". Roast their personal brand, their delusions of grandeur, and what this reveals about them.`,
    mood: `The user's current mood/emoji: "${inputContent}". Roast their emotional state and life choices that led to this moment.`,
    jobtitle: `The user's job title is: "${inputContent}". Roast their career, their life decisions, and what this job title actually means.`,
    random: `Generate a completely random, absurd roast target scenario and roast it. The user gave you no input — make something up and destroy it.`
  };

  const systemPrompt = `${personaConfig.voice}

INTENSITY LEVEL: ${intensity.toUpperCase()}
${intensityConfig.instruction}

ROAST STYLE: ${roastStyle}
THEME: ${theme}
LANGUAGE COMPLEXITY: ${languageComplexity}

ROAST FORMAT RULES:
- Length: 3-5 sentences maximum. Every word must earn its place. No filler.
- Structure: Setup → Escalation → Kill shot final line
- The last sentence should be the hardest hitting — land it like a punchline
- Do NOT start with "Oh," or "Well," or any lazy opener
- Do NOT use emojis
- Do NOT break character at any point
- Sign off in character: ${personaConfig.signoff}
- Make it feel tailor-made, not generic. Generic roasts are weak roasts.

${profileContext}
${memoryContext}`;

  const userPrompt = `${(inputInstructions as any)[inputType] || inputInstructions.text}

Roast this person/situation now. Make it ${intensity === 'scorched' ? 'legendary' : 'memorable'}.`;

  return { systemPrompt, userPrompt };
}

export async function callGeminiRoast({ systemPrompt, userPrompt }: { systemPrompt: string; userPrompt: string }) {
  const currentKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "AQ.Ab8RN6KCopmsqXal-ugQ5RRhNYvepNfig_wbvCLynyacrc5F_A";
  
  if (!currentKey || currentKey === "MY_GEMINI_API_KEY" || currentKey === "missing_key" || currentKey.trim() === "") {
    console.warn("GEMINI_API_KEY not configured. Falling back to internal roast engine.");
    return null; // Return null to signal fallback needed
  }

  try {
    const aiInstance = new GoogleGenAI({ apiKey: currentKey });
    const response = await aiInstance.models.generateContent({ 
      model: "gemini-2.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt
      }
    });
    
    return response.text?.trim() || null;
  } catch (err: any) {
    console.error("Gemini AI Call Failed:", err);
    return null;
  }
}

// BATTLE MODE — Generate matched roasts for two participants
export function buildBattleRoastPrompt({ topic, participant, opponentName, intensity = 'savage' }: any) {
  return {
    systemPrompt: `You are the ultimate roast battle judge and MC. 
Generate a roast for a head-to-head roast battle.
Intensity: ${(INTENSITY_MODIFIERS as any)[intensity].instruction}
Rules: Roast must be about the TOPIC provided, personalized to the participant.
4 sentences max. End with a line so sharp it would win a battle.`,
    userPrompt: `Battle topic: "${topic}"
Roast this participant: ${participant}
Their opponent is named: ${opponentName} (reference them once for battle energy).
Generate the roast now.`
  };
}

// DAILY ROAST — Personalized daily delivery
export function buildDailyRoastPrompt({ userProfile, date, dayOfWeek }: any) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = days[new Date(date).getDay()];
  
  const dayContext: any = {
    Monday: "It's Monday. The week is fresh. Their disappointment is fresher.",
    Tuesday: "It's Tuesday. The least interesting day. Much like them.",
    Wednesday: "It's Wednesday. Hump day. They haven't done anything notable yet.",
    Thursday: "It's Thursday. Almost Friday. They haven't earned it.",
    Friday: "It's Friday. They survived another week of being themselves. Somehow.",
    Saturday: "It's Saturday. They should be living their best life. They're not.",
    Sunday: "It's Sunday. The dread is setting in. Their life choices brought them here."
  };

  return {
    systemPrompt: `You are delivering a personalized Daily Roast — like a horoscope but accurate and mean.
Style: Wise, knowing, slightly prophetic. Like the universe itself is judging them.
Length: Exactly 3 sentences. No more, no less.
${dayContext[dayName]}`,
    userPrompt: `Generate today's Daily Roast for this person:
- Job: ${userProfile?.jobTitle || 'unemployed, spiritually'}
- Hobbies: ${(userProfile?.hobbies || []).join(', ') || 'none'}
- Streak: ${userProfile?.streak || 0} days using this app
- Day: ${dayName}

Make it feel like it was written specifically for their ${dayName}.`
  };
}
