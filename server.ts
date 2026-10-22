import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import compression from "compression";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import fs from "fs";
import { randomBytes } from "crypto";
import { admin, collections, getAdminAuth, getAdminDb, auth as firebaseAuth, getFirebaseHealth } from "./server/lib/firebase-admin.ts";
import bcrypt from "bcryptjs";
import { userService } from "./server/services/userService.ts";
import { economyService, REWARDS, ECONOMY } from "./server/services/economyService.ts";
import { 
  addRMP, 
  getUserEconomyStats, 
  getDailyActivity, 
  trackTimeSpentStrict, 
  claimDailyLogin, 
  getRemainingEarnings,
  hasEarnedToday 
} from "./server/utils/economy.ts";
import { authenticateMiddleware } from "./server/utils/auth.ts";
import { MASTER_QUESTION_BANK, getQuestionsByCategory } from "./src/lib/triviaQuestions.ts";
import { roomService } from "./server/services/roomService.ts";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { getRoast } from "./server/utils/geminiRoastGenerator.ts";
import { scoreRoast, getUserRoastTierFromStats } from "./src/utils/roastEngine.ts";
import { getAutomatedSettingsForUser } from "./server/utils/automationEngine.ts";
import { socialUpgradesRouter } from "./server/routes/socialUpgrades.ts";

import { buildRoastPrompt, callGeminiRoast } from "./server/services/roastAI.ts";
import { saveRoastSession, updateRoastSession, getRoastProfile } from "./server/services/roastFirestore.ts";

// Add global error handlers to prevent silent crashes and log details
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection] at:', promise, 'reason:', reason);
  // Optionally log the stack trace if reason is an Error
  if (reason instanceof Error) {
    console.error(reason.stack);
  }
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception] thrown:', err);
  // We can choose to exit or continue depending on the severity
  // For dev, continuing is usually better to keep the server alive
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(process.cwd(), "data.json");

// Helper to get auth safely
const getAuth = getAdminAuth;
const getDb = getAdminDb;

// Initialize Gemini AI for server-side generation
let aiInstance: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "AQ.Ab8RN6KCopmsqXal-ugQ5RRhNYvepNfig_wbvCLynyacrc5F_A";
  
  // If we're on a platform that injects keys, use them. 
  if (!key || key === "MY_GEMINI_API_KEY" || key === "missing_key" || key.trim() === "") {
    if (process.env.NODE_ENV === 'production') {
      console.warn("[AI] GEMINI_API_KEY is not configured. AI features will use enhanced fallbacks.");
    }
    return null;
  }
  
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: key });
  }
  return aiInstance;
}

// Cooldown for roast generation
const roastCooldowns = new Map<string, number>();

function checkRoastCooldown(userId: string): { allowed: boolean; waitTime?: number } {
  const lastRequest = roastCooldowns.get(userId);
  if (lastRequest) {
    const timeSince = Date.now() - lastRequest;
    if (timeSince < 10000) { // 10 second cooldown
      return { allowed: false, waitTime: 10000 - timeSince };
    }
  }
  roastCooldowns.set(userId, Date.now());
  return { allowed: true };
}

// In-memory storage for roasts (simulating a database)
// WARNING: In-memory storage is not shared across instances in Cloud Run.
// For production scale (1000+ users/sec), use Redis or Firestore.
let roasts: Record<string, any> = {};
let users: Record<string, any> = {};
let usernameHistory: any[] = [];
let roastboardViews: any[] = [];
let shortLinks: Record<string, any> = {};
let coinTransactions: any[] = [];
let rmpTransactions: any[] = [];
let notifications: Record<string, any[]> = {};

let dailyQuestionPools: Record<string, any> = {};
let userSeenQuestions: Record<string, Record<string, number>> = {};
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function getUnseenQuestions(userId: string, pool: any[], count: number) {
  if (!userSeenQuestions[userId]) userSeenQuestions[userId] = {};
  const now = Date.now();
  const seenMap = userSeenQuestions[userId];
  
  for (const qid in seenMap) {
    if (now - seenMap[qid] > THIRTY_DAYS_MS) {
      delete seenMap[qid];
    }
  }

  const unseen = pool.filter(q => {
    const lastSeen = seenMap[q.id];
    return !lastSeen || (now - lastSeen) > THIRTY_DAYS_MS;
  });

  const shuffled = unseen.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);
  
  if (selected.length < count) {
    const remainingCount = count - selected.length;
    const selectedIds = new Set(selected.map(q => q.id));
    const fallback = pool.filter(q => !selectedIds.has(q.id)).sort(() => Math.random() - 0.5).slice(0, remainingCount);
    selected.push(...fallback);
  }
  
  selected.forEach(q => {
    seenMap[q.id] = now;
  });
  
  return selected;
}
let quickBattles: Record<string, any> = {};
let gauntletRuns: Record<string, any> = {};

const GAUNTLET_REWARDS = [
  { milestone: 10, rmp: 20, coins: 0, badge: null },
  { milestone: 25, rmp: 50, coins: 0, badge: "Survivor" },
  { milestone: 50, rmp: 100, coins: 5, badge: "Gauntlet Runner" },
  { milestone: 100, rmp: 500, coins: 10, badge: "Legend" }
];


function addNotification(userId: string, notification: any) {
  if (!userId) return;
  const user = users[userId];
  // Default to true if not set
  if (user && user.notificationsEnabled === false) return;
  
  if (!notifications[userId]) notifications[userId] = [];
  notifications[userId].push({
    id: Math.random().toString(36).substr(2, 9),
    createdAt: new Date().toISOString(),
    read: false,
    ...notification
  });
}
let challenges: Record<string, any> = {};
let monthlyChallenges: Record<string, any> = {};
let reactions: Record<string, any[]> = {}; // roastId -> reactions[]
let battleVotes: any[] = [];
let userSessions: Record<string, any> = {};
let anonymousMessages: Record<string, any[]> = {};
let anonymousLinks: Record<string, any> = {};
let anonymousInboxes: Record<string, any[]> = {}; // username -> messages[]
let friendshipChallenges: Record<string, any> = {};
let friendshipQuestionPool: any[] = [];
let friendshipQuestionSets: Record<string, any> = {};
let friendshipGameSessions: Record<string, any> = {};
let gameStats: Record<string, any> = {};
let todChallenges: Record<string, any> = {};
let todLobbies: Record<string, any> = {};
let todStreaks: Record<string, any> = {};
let todOpenChallenges: Record<string, any> = {};
let prankLinks: Record<string, any> = {};
let prankDeliveries: any[] = [];
let invites: Record<string, any> = {};
let userActivity: any[] = [];
let usernameToId: Record<string, string> = {}; // usernameLower -> userId
let roastCache: any[] = []; // Array of { input: string, output: string, mode: string }

let todInvites: Record<string, any> = {};
let todResponses: Record<string, any[]> = {}; // code -> responses[]
let todConversations: Record<string, any> = {}; // id -> conversation
let todMessages: Record<string, any[]> = {}; // conversationId -> messages[]
let duoBattles: Record<string, any> = {};
let duoBattleVotes: Record<string, any[]> = {}; // battleId -> voters[]
let userStreaks: Record<string, any> = {};
let dailyQuestsData: Record<string, any> = {};
let clans: Record<string, any> = {};
let weeklyLeaderboard: Record<string, any> = {};
let roastScores: Record<string, any> = {};
let userRoastTiers: Record<string, any> = {};
let roastCombos: Record<string, any> = {};

const RANKS = [
  {name:"Rookie",      min:0,     max:499,    emoji:"🥉", color:"#94a3b8"},
  {name:"Scholar",     min:500,   max:1499,   emoji:"📚", color:"#60a5fa"},
  {name:"Champion",    min:1500,  max:3499,   emoji:"🏆", color:"#34d399"},
  {name:"Elite",       min:3500,  max:6999,   emoji:"⭐", color:"#fbbf24"},
  {name:"Legend",      min:7000,  max:14999,  emoji:"👑", color:"#f59e0b"},
  {name:"Mythic",      min:15000, max:Infinity,emoji:"🔱",color:"#e879f9"},
];

const MOCK_LB = [
  {name:"GraceK",    score:12450, rank:"Mythic",   badge:"🔱"},
  {name:"BiblePro",  score:9800,  rank:"Legend",   badge:"👑"},
  {name:"GoalKing",  score:7200,  rank:"Legend",   badge:"👑"},
  {name:"QuizMaster",score:5100,  rank:"Elite",    badge:"⭐"},
  {name:"StudyBoy",  score:3800,  rank:"Elite",    badge:"⭐"},
];

// Phase 1 - Traceable truth or dare
let traceableDares: any[] = [];
let dareCombos: Record<string, any> = {};
let dareBadges: Record<string, any[]> = {}; // Map of userId -> badges[]

const QUEST_TYPES = [
  { id: 'roast', name: '🔥 Ignite', description: 'Create a roast', target: 1, rewardRMP: 10, rewardCoins: 0 },
  { id: 'battle', name: '⚔️ Challenge', description: 'Send a battle invite', target: 1, rewardRMP: 15, rewardCoins: 0 },
  { id: 'game', name: '🎮 Play', description: 'Play any game', target: 1, rewardRMP: 10, rewardCoins: 0 },
  { id: 'friendship', name: '🤝 Connect', description: 'Send a friendship challenge', target: 1, rewardRMP: 15, rewardCoins: 0 },
  { id: 'anonymous', name: '👻 Confess', description: 'Send an anonymous message', target: 1, rewardRMP: 10, rewardCoins: 0 },
  { id: 'tod', name: '🎲 Dare', description: 'Complete a Truth or Dare', target: 1, rewardRMP: 15, rewardCoins: 0 },
  { id: 'prank', name: '🎭 Prank', description: 'Create a prank', target: 1, rewardRMP: 10, rewardCoins: 0 },
  { id: 'feed', name: '📱 Scroll', description: 'Scroll feed for 2 minutes', target: 120, rewardRMP: 10, rewardCoins: 0, unit: 'seconds' }
];

const DARE_TYPES: Record<string, any> = {
  roast: {
    easy: { description: "Create a roast", redirect: "/", condition: "roast_created", rewardRMP: 15, timeLimitMinutes: 1440 },
    medium: { description: "Roast someone by username", redirect: "/", condition: "roast_with_target", rewardRMP: 25, timeLimitMinutes: 120 },
    hard: { description: "Get 10+ reactions on your roast", redirect: "/", condition: "reactions>=10", rewardRMP: 40, timeLimitMinutes: 60 }
  },
  battle: {
    easy: { description: "Start a battle", redirect: "/battle", condition: "battle_started", rewardRMP: 20, timeLimitMinutes: 120 },
    medium: { description: "Win a battle", redirect: "/battle", condition: "battle_won", rewardRMP: 50, timeLimitMinutes: 60 },
    hard: { description: "Win 3 battles in a row", redirect: "/battle", condition: "battle_streak>=3", rewardRMP: 100, timeLimitMinutes: 180 }
  },
  game: {
    easy: { description: "Play any game", redirect: "/games", condition: "game_played", rewardRMP: 15, timeLimitMinutes: 1440 },
    medium: { description: "Score 70%+ on Football Trivia", redirect: "/games/football-trivia", condition: "score>=70", rewardRMP: 30, timeLimitMinutes: 60 },
    hard: { description: "Score 90%+ on Bible Trivia", redirect: "/games/bible-trivia", condition: "score>=90", rewardRMP: 50, timeLimitMinutes: 45 }
  },
  social: {
    easy: { description: "Send an anonymous message", redirect: "/anonymous", condition: "message_sent", rewardRMP: 15, timeLimitMinutes: 1440 },
    medium: { description: "Send a friendship challenge", redirect: "/friendship", condition: "challenge_sent", rewardRMP: 25, timeLimitMinutes: 120 },
    hard: { description: "Receive 3 anonymous messages", redirect: "/anonymous", condition: "messages_received>=3", rewardRMP: 40, timeLimitMinutes: 360 }
  },
  prank: {
    easy: { description: "Create a prank", redirect: "/prank/create", condition: "prank_created", rewardRMP: 20, timeLimitMinutes: 1440 },
    medium: { description: "Share a prank link", redirect: "/prank/create", condition: "prank_shared", rewardRMP: 30, timeLimitMinutes: 120 },
    hard: { description: "Get 5+ clicks on your prank", redirect: "/prank/create", condition: "prank_clicks>=5", rewardRMP: 50, timeLimitMinutes: 360 }
  },
  feed: {
    easy: { description: "Scroll feed for 2 minutes", redirect: "/feed", condition: "scroll_time>=120", rewardRMP: 10, timeLimitMinutes: 1440 },
    medium: { description: "React to 10 roasts", redirect: "/feed", condition: "reactions_given>=10", rewardRMP: 20, timeLimitMinutes: 60 },
    hard: { description: "Share a roast from feed", redirect: "/feed", condition: "roast_shared", rewardRMP: 30, timeLimitMinutes: 120 }
  },
  streak: {
    easy: { description: "Maintain 3-day streak", redirect: "/", condition: "streak>=3", rewardRMP: 50, timeLimitMinutes: 4320 },
    medium: { description: "Maintain 7-day streak", redirect: "/", condition: "streak>=7", rewardRMP: 150, timeLimitMinutes: 10080 },
    hard: { description: "Maintain 30-day streak", redirect: "/", condition: "streak>=30", rewardRMP: 500, timeLimitMinutes: 43200 }
  }
};

const BADGES: Record<string, any> = {
  "First Step": { requirement: 1, rewardRMP: 10 },
  "Getting Started": { requirement: 10, rewardRMP: 50 },
  "Dedicated": { requirement: 50, rewardRMP: 200 },
  "Addicted": { requirement: 100, rewardRMP: 500 },
  "Legend": { requirement: 500, rewardRMP: 2000 }
};

async function updateQuestProgress(userId: string, questId: string, progress: number = 1) {
  const d = new Date().toISOString().split('T')[0];
  if (!dailyQuestsData[userId] || dailyQuestsData[userId].date !== d) {
    // initialize
    const questsObj: Record<string, boolean> = {};
    for (const q of QUEST_TYPES) {
      questsObj[q.id] = false;
    }
    dailyQuestsData[userId] = {
      date: d,
      quests: questsObj,
      allCompleted: false,
      claimedReward: false
    };
  }
  
  if (dailyQuestsData[userId].quests[questId]) return;
  dailyQuestsData[userId].quests[questId] = true;
  
  const allCompleted = QUEST_TYPES.every(q => dailyQuestsData[userId].quests[q.id]);
  dailyQuestsData[userId].allCompleted = allCompleted;
  
  saveData();
}

const MAX_ROASTS = 20000;

function getLevenshteinDistance(s1: string, s2: string): number {
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

function cleanupRoasts() {
  const roastIds = Object.keys(roasts);
  if (roastIds.length > MAX_ROASTS) {
    console.log(`[STORAGE] Storage limit exceeded (${roastIds.length}/${MAX_ROASTS}). Cleaning up...`);
    
    // Sort by date (oldest first)
    const sortedRoasts = roastIds.map(id => ({ id, createdAt: new Date(roasts[id].createdAt).getTime() }))
      .sort((a, b) => a.createdAt - b.createdAt);
    
    // Delete oldest 10% or enough to get under limit
    const toDeleteCount = Math.max(Math.ceil(MAX_ROASTS * 0.1), roastIds.length - MAX_ROASTS);
    const toDelete = sortedRoasts.slice(0, toDeleteCount);
    
    toDelete.forEach(item => {
      delete roasts[item.id];
      // Also cleanup related data
      delete reactions[item.id];
      delete challenges[item.id];
    });
    
    console.log(`[STORAGE] Deleted ${toDeleteCount} old roasts.`);
  }

  // Cleanup old anonymous messages (30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  Object.keys(anonymousMessages).forEach(userId => {
    anonymousMessages[userId] = anonymousMessages[userId].filter(msg => 
      new Date(msg.createdAt).getTime() > thirtyDaysAgo.getTime()
    );
  });

  // Cleanup old friendship challenges (7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  Object.keys(friendshipChallenges).forEach(id => {
    if (new Date(friendshipChallenges[id].createdAt).getTime() < sevenDaysAgo.getTime()) {
      delete friendshipChallenges[id];
    }
  });

  // Cleanup old ToD challenges (3 days)
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  Object.keys(todChallenges).forEach(id => {
    if (new Date(todChallenges[id].createdAt).getTime() < threeDaysAgo.getTime()) {
      delete todChallenges[id];
    }
  });

  // Cleanup old ToD lobbies (1 hour)
  const oneHourAgo = new Date(Date.now() - 3600000);
  Object.keys(todLobbies).forEach(id => {
    if (new Date(todLobbies[id].createdAt).getTime() < oneHourAgo.getTime()) {
      delete todLobbies[id];
    }
  });

  // Cleanup old prank links (30 days)
  Object.keys(prankLinks).forEach(id => {
    if (new Date(prankLinks[id].expiresAt).getTime() < new Date().getTime()) {
      delete prankLinks[id];
    }
  });
}

let saveTimeout: NodeJS.Timeout | null = null;
// HELPER FUNCTIONS
function refineInput(target: string): string {
  if (!target || target === 'someone') return 'someone';
  
  const intensifiers = [
    "the legendary", "the so-called", "the one and only", "the infamous",
    "the self-proclaimed", "the wannabe", "the struggling", "the desperate",
    "the confused", "the delusional", "the dramatic", "the chaotic"
  ];
  
  const randomIntensifier = intensifiers[Math.floor(Math.random() * intensifiers.length)];
  return `${randomIntensifier} ${target}`;
}

// ============================================
// PREMIUM ROAST GENERATION ENGINE
// ============================================

const premiumRoasts: Record<string, Record<string, string[]>> = {
  mild: {
    comeback: [
      `@{target} has the confidence of a toddler who just discovered a light switch—cute but ultimately useless.`,
      `@{target} walks around like they're the main character in a movie that went straight to DVD.`,
      `@{target} brings the energy of a deflated balloon at a child's birthday party—present but completely unnecessary.`,
      `@{target} thinks they're the final boss, but they're really just the tutorial level nobody asked for.`,
      `@{target} has the personality of a default ringtone—annoying and impossible to change.`,
      `@{target} is like a software update: nobody asked for it, and it makes everything worse.`
    ],
    challenge: [
      `@{target} talks like Google but searches like Internet Explorer—slow and outdated.`,
      `@{target} couldn't roast a marshmallow, let alone another human being.`,
      `@{target} has the roasting skills of a microwave—lukewarm and disappointing.`,
      `@{target} thinks they're spicy, but they're really just unseasoned chicken.`
    ],
    self_deprecating: [
      `@{target} and I are both proof that even God has a sense of humor—and it's dark.`,
      `I'd roast @{target}, but my mirror already does that job every morning.`,
      `@{target} and I are like two wrongs trying to make a right—it's not working.`,
      `We're both walking examples of why some people should just stay home.`
    ],
    existential: [
      `@{target} is what happens when mediocrity peaks and refuses to leave.`,
      `Somewhere in the universe, a black hole is pulling energy away from @{target}'s charisma.`,
      `@{target} is living proof that anyone can make it in this world—and that's not a compliment.`,
      `The universe created @{target} as a warning to others, and we're all still trying to understand why.`
    ]
  },
  medium: {
    comeback: [
      `@{target} has the charm of a spam email and the wit of a captcha test.`,
      `@{target} walks around like their opinion matters in a world that's already muted them.`,
      `@{target} brings so little to the table, the table's embarrassed to have legs.`,
      `@{target} is the human equivalent of a low-battery notification—annoying and constantly draining.`,
      `@{target} talks like they have a PhD in nonsense from the University of Irrelevant Opinions.`,
      `@{target} has the emotional range of a brick wall and the personality of a wet napkin.`
    ],
    challenge: [
      `@{target} couldn't win a roast battle against a deaf mute with no sense of humor.`,
      `@{target} talks trash like they're allergic to good decisions and fresh air.`,
      `@{target} thinks they're a 10, but even their reflection gives them a pity discount.`,
      `@{target} has the confidence of someone who's never been told the truth—and it shows.`
    ],
    self_deprecating: [
      `@{target} and I are both proof that evolution can sometimes go backward for a whole generation.`,
      `I'd roast @{target}, but the mirror would crack from the reflection—and we can't afford that.`,
      `@{target} and I are like two expired coupons—completely useless but still taking up space.`,
      `We're both the reason some animals eat their young.`
    ],
    existential: [
      `@{target} is the reason God created ugly and then decided to add a little extra as a warning.`,
      `@{target}'s birth certificate is an apology letter from the hospital to the entire human race.`,
      `The universe expanded for 13.8 billion years just to create @{target}, and honestly? It was a waste.`,
      `@{target} is what happens when you order personality from Wish.com.`
    ]
  },
  brutal: {
    comeback: [
      `@{target} looks like they were drawn from memory by someone who's never seen a human.`,
      `@{target} has a face that could make an onion cry and then apologize for crying.`,
      `@{target} is the human equivalent of a participation trophy—nobody asked for it, and nobody wants it.`,
      `@{target} walks around like they're gods gift to humanity, but even God returned the receipt.`,
      `@{target} has the charisma of a wet sock and the intelligence of a broken calculator.`,
      `@{target} is proof that natural selection isn't as effective as we thought.`
    ],
    challenge: [
      `@{target} couldn't roast a chicken in a microwave, let alone another person.`,
      `@{target} talks like they're the CEO of being wrong, and business is booming.`,
      `@{target} thinks they're a legend, but even myths have better credibility.`,
      `@{target} has the roasting skills of a toaster—only good for burning things by accident.`
    ],
    self_deprecating: [
      `@{target} and I are both mistakes, but at least I admit it.`,
      `I'd say @{target} is ugly, but that would be an insult to ugly people everywhere.`,
      `@{target} and I are the reason some families don't talk during holidays.`,
      `We're both the physical manifestation of regret—and we wear it like a badge of shame.`
    ],
    existential: [
      `@{target} is the reason aliens won't visit Earth—they're afraid of catching secondhand embarrassment.`,
      `@{target}'s existence is the strongest argument for atheism I've ever seen.`,
      `The universe created @{target} as a social experiment to see how much disappointment one person can cause.`,
      `@{target} is what happens when God runs out of ideas and just starts hitting random buttons.`
    ]
  }
};

// Add dynamic elements to make roasts feel fresh and premium
const dynamicOpeners = [
  "Brace yourself...", "Hold onto your ego...", "I'm about to hurt your feelings...", 
  "Sit down for this...", "Don't say I didn't warn you...", "Here we go...",
  "Logically speaking...", "Statistically speaking...", "In the grand scheme of things...",
  "Let's be honest here...", "The truth is brutal:"
];

const dynamicClosers = [
  "💀", "🔥", "😭", "🫣", "📸", "👀", "💀💀💀", "🔥🔥🔥", "😭😭😭",
  "You asked for this.", "Don't hate the player, hate the mirror.", "Better luck next life.",
  "Facts don't care about your feelings.", "Roasted.",
  "And that's on period.", "No cap.", "Deadass."
];

function getDynamicOpener(): string {
  return dynamicOpeners[Math.floor(Math.random() * dynamicOpeners.length)];
}

function getDynamicCloser(): string {
  return dynamicClosers[Math.floor(Math.random() * dynamicClosers.length)];
}

function generatePremiumRoast(params: { target: string, intensity: string, roastType: string }): string {
  const { target, intensity, roastType } = params;
  
  // Get base roast from templates
  const intensityRoasts = premiumRoasts[intensity] || premiumRoasts.medium;
  const typeRoasts = intensityRoasts[roastType] || intensityRoasts.comeback;
  let baseRoast = typeRoasts[Math.floor(Math.random() * typeRoasts.length)];
  
  // Replace target placeholder
  baseRoast = baseRoast.replace(/@{target}/g, target);
  
  // Add dynamic opener (30% chance)
  if (Math.random() > 0.7) {
    baseRoast = `${getDynamicOpener()} ${baseRoast}`;
  }
  
  // Add dynamic closer (always for medium/brutal, sometimes for mild)
  if (intensity !== 'mild' || Math.random() > 0.5) {
    baseRoast = `${baseRoast} ${getDynamicCloser()}`;
  }
  
  return baseRoast;
}

function applyPremiumLanguageComplexity(roast: string, complexity: string): string {
  if (complexity === 'simple') {
    return roast
      .replace(/couldn't/g, 'cant')
      .replace(/wouldn't/g, 'wont')
      .replace(/shouldn't/g, 'shouldnt')
      .replace(/doesn't/g, 'doesnt')
      .replace(/isn't/g, 'isnt')
      .replace(/aren't/g, 'arent')
      .replace(/wasn't/g, 'wasnt')
      .replace(/weren't/g, 'werent');
  }
  
  if (complexity === 'complex') {
    return roast
      .replace(/\bis\b/g, 'is indeed')
      .replace(/\bhas\b/g, 'possesses')
      .replace(/\blike\b/g, 'similar to')
      .replace(/\bproof\b/g, 'irrefutable evidence')
      .replace(/\breason\b/g, 'primary causation')
      .replace(/\bwalk\b/g, 'ambulate')
      .replace(/\btalk\b/g, 'verbalize')
      .replace(/\bthink\b/g, 'cognitively process');
  }
  
  return roast;
}

function applyPremiumSalvageMode(roast: string, mode: string): string {
  if (mode === 'light') {
    const salvages = [
      " (No hard feelings though 😅)",
      " (Just kidding, you're cool)",
      " (All love though ❤️)",
      " (Respectfully, of course)",
      " (I'm just playing 😂)"
    ];
    return roast + salvages[Math.floor(Math.random() * salvages.length)];
  }
  
  if (mode === 'heavy') {
    const salvages = [
      " But real talk, you're actually goated for taking this roast. Respect. 🫡",
      " All jokes aside, you have more courage than 99% of people. Legend. 👑",
      " For real though, you're a champ for even posting this. Mad respect. 🔥",
      " Jokes aside, you're actually that guy. Keep being awesome. 💪",
      " But fr, you took this like a king/queen. Salute. 🎯"
    ];
    return roast + salvages[Math.floor(Math.random() * salvages.length)];
  }
  
  return roast;
}

function saveData() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      cleanupRoasts();
      const data = {
        roasts,
        users,
        usernameHistory,
        roastboardViews,
        shortLinks,
        coinTransactions,
        rmpTransactions,
        notifications,
        challenges,
        monthlyChallenges,
        reactions,
        battleVotes,
        userSessions,
        anonymousMessages,
        anonymousLinks,
        anonymousInboxes,
        friendshipChallenges,
        friendshipQuestionPool,
        friendshipQuestionSets,
        friendshipGameSessions,
        gameStats,
        todChallenges,
        todLobbies,
        todStreaks,
        todOpenChallenges,
        prankLinks,
        prankDeliveries,
        invites,
        todInvites,
        todResponses,
        todConversations,
        todMessages,
        userActivity,
        roastCache,
        duoBattles,
        duoBattleVotes,
        userStreaks,
        dailyQuestsData,
        clans,
        weeklyLeaderboard,
        roastScores,
        userRoastTiers,
        roastCombos,
        traceableDares,
        dareCombos,
        dareBadges
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      console.log("[PERSISTENCE] Data saved successfully.");
    } catch (err) {
      console.error("[PERSISTENCE] Failed to save data:", err);
    }
  }, 1000); // Debounce for 1 second
}

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const data = JSON.parse(raw);
      roasts = data.roasts || {};
      users = data.users || {};
      usernameHistory = data.usernameHistory || [];
      roastboardViews = data.roastboardViews || [];
      shortLinks = data.shortLinks || {};
      coinTransactions = data.coinTransactions || [];
      rmpTransactions = data.rmpTransactions || [];
      notifications = data.notifications || {};
      challenges = data.challenges || {};
      monthlyChallenges = data.monthlyChallenges || {};
      reactions = data.reactions || {};
      battleVotes = data.battleVotes || [];
      userSessions = data.userSessions || {};
      anonymousMessages = data.anonymousMessages || {};
      anonymousLinks = data.anonymousLinks || {};
      anonymousInboxes = data.anonymousInboxes || {};
      friendshipChallenges = data.friendshipChallenges || {};
      friendshipQuestionPool = data.friendshipQuestionPool || [];
      friendshipQuestionSets = data.friendshipQuestionSets || {};
      friendshipGameSessions = data.friendshipGameSessions || {};
      gameStats = data.gameStats || {};
      todChallenges = data.todChallenges || {};
      todLobbies = data.todLobbies || {};
      todStreaks = data.todStreaks || {};
      todOpenChallenges = data.todOpenChallenges || {};
      prankLinks = data.prankLinks || {};
      prankDeliveries = data.prankDeliveries || [];
      invites = data.invites || {};
      todInvites = data.todInvites || {};
      todResponses = data.todResponses || {};
      todConversations = data.todConversations || {};
      todMessages = data.todMessages || {};
      userActivity = data.userActivity || [];
      roastCache = data.roastCache || [];
      duoBattles = data.duoBattles || {};
      duoBattleVotes = data.duoBattleVotes || {};
      userStreaks = data.userStreaks || {};
      dailyQuestsData = data.dailyQuestsData || {};
      clans = data.clans || {};
      weeklyLeaderboard = data.weeklyLeaderboard || {};
      roastScores = data.roastScores || {};
      userRoastTiers = data.userRoastTiers || {};
      roastCombos = data.roastCombos || {};
      traceableDares = data.traceableDares || [];
      dareCombos = data.dareCombos || {};
      dareBadges = data.dareBadges || [];
      
      // Populate usernameToId map and ensure usernameLower exists
      usernameToId = {};
      Object.values(users).forEach((u: any) => {
        if (u.username) {
          const lower = u.username.toLowerCase();
          u.usernameLower = lower;
          usernameToId[lower] = u.id;
        }
      });
      
      console.log("[PERSISTENCE] Data loaded successfully.");
    }
  } catch (err) {
    console.error("[PERSISTENCE] Failed to load data:", err);
  }
}

// Helper to get or create a session for anonymous users
function getSession(req: express.Request) {
  const sessionId = req.headers['x-session-id'] as string || Math.random().toString(36).substr(2, 9);
  if (!userSessions[sessionId]) {
    userSessions[sessionId] = { id: sessionId, createdAt: new Date().toISOString() };
  }
  return userSessions[sessionId];
}

// Helper to get current month string (YYYY-MM)
const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// Helper to update monthly participant stats
const updateMonthlyStats = (userId: string, stats: { roasts?: number; shares?: number; coins?: number }) => {
  const month = getCurrentMonth();
  if (!monthlyChallenges[month]) {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    monthlyChallenges[month] = {
      month,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      isActive: true,
      participants: {}
    };
  }
  
  if (!monthlyChallenges[month].participants[userId]) {
    monthlyChallenges[month].participants[userId] = {
      userId,
      totalRoasts: 0,
      totalShares: 0,
      totalCoinsEarned: 0,
      updatedAt: new Date().toISOString()
    };
  }
  
  const p = monthlyChallenges[month].participants[userId];
  if (stats.roasts) p.totalRoasts += stats.roasts;
  if (stats.shares) p.totalShares += stats.shares;
  if (stats.coins) p.totalCoinsEarned += stats.coins;
  p.updatedAt = new Date().toISOString();
};

// Username validation helpers (copied from utility to avoid import issues in server.ts if needed, but we can use them directly if we want)
const USERNAME_REGEX = /^[a-zA-Z0-9@#_&]+$/;
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 30;

function validateUsername(username: string) {
  if (!username || username.trim().length === 0) return { isValid: false, error: 'Username cannot be empty' };
  const cleaned = username.trim();
  if (cleaned.length < MIN_USERNAME_LENGTH) return { isValid: false, error: `Username must be at least ${MIN_USERNAME_LENGTH} characters` };
  if (cleaned.length > MAX_USERNAME_LENGTH) return { isValid: false, error: `Username cannot exceed ${MAX_USERNAME_LENGTH} characters` };
  if (!USERNAME_REGEX.test(cleaned)) return { isValid: false, error: 'Only letters, numbers, and these symbols are allowed: @ # _ &' };
  if (/([@#_&]{2,})/.test(cleaned)) return { isValid: false, error: 'Cannot have consecutive special characters' };
  if (/^[@#_&]/.test(cleaned)) return { isValid: false, error: 'Username cannot start with a special character' };
  if (/[@#_&]$/.test(cleaned)) return { isValid: false, error: 'Username cannot end with a special character' };
  return { isValid: true };
}

function generateRoastboardSlug(username: string) {
  return username.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
}

// Coin System Helpers
const COIN_REWARDS = {
  ROAST_SHARE: 1,
  REFERRAL: 1,
  DAILY_BONUS: 5,
  ROAST_BACK: 2,
  ACHIEVEMENT: 10,
  STREAK_7: 15,
  STREAK_30: 50,
  TOP_ROASTER_WEEKLY: 100,
  SETUP: 5,
  CHALLENGE_ACCEPTED: 10,
  REMIX: 3,
  BATTLE_WIN: 2,
  DARE_COMPLETE: 5,
  QUEST_COMPLETE: 10,
  LOGIN_STREAK: 1
};

function awardCoins(userId: string, type: keyof typeof COIN_REWARDS, description: string, relatedId?: string) {
  const amount = COIN_REWARDS[type];
  if (!users[userId]) {
    users[userId] = { 
      id: userId, 
      totalShares: 0, 
      totalRoasts: 0, 
      coinBalance: 0, 
      totalCoinsEarned: 0, 
      rmpBalance: 0, 
      totalRMPEarned: 0, 
      viewCount: 0,
      monthlyCoins: 0,
      lastCoinReset: new Date().toISOString()
    };
  }
  
  users[userId].coinBalance = (users[userId].coinBalance || 0) + amount;
  users[userId].totalCoinsEarned = (users[userId].totalCoinsEarned || 0) + amount;
  users[userId].monthlyCoins = (users[userId].monthlyCoins || 0) + amount;
  
  const transaction = {
    id: Math.random().toString(36).substr(2, 9),
    userId,
    type,
    amount,
    balance: users[userId].coinBalance,
    description,
    relatedId,
    createdAt: new Date().toISOString()
  };
  
  coinTransactions.push(transaction);

  // Update monthly stats
  updateMonthlyStats(userId, { coins: amount });
  
  saveData();
  return users[userId].coinBalance;
}

const QUESTION_SETS = [
  {
    id: "best-friends",
    name: "Best Friends Edition",
    questions: [
      { question: "What was my childhood nickname?", options: [] },
      { question: "What's my biggest fear?", options: [] },
      { question: "What's my favorite food?", options: [] },
      { question: "What's something I've never told anyone?", options: [] },
      { question: "Who's my celebrity crush?", options: [] },
      { question: "What's my worst habit?", options: [] },
      { question: "What's my hidden talent?", options: [] },
      { question: "What would I do with a million dollars?", options: [] },
      { question: "What's my favorite memory of us?", options: [] },
      { question: "What always makes me laugh?", options: [] }
    ]
  },
  {
    id: "couples",
    name: "Couples Edition",
    questions: [
      { question: "What's my love language?", options: [] },
      { question: "What's my favorite date night?", options: [] },
      { question: "What's something I find romantic?", options: [] },
      { question: "What's my pet peeve about you?", options: [] },
      { question: "What's my dream home feature?", options: [] },
      { question: "What song reminds you of us?", options: [] },
      { question: "What's something I want to learn together?", options: [] },
      { question: "What's my favorite thing about you?", options: [] }
    ]
  },
  {
    id: "siblings",
    name: "Sibling Rivalry",
    questions: [
      { question: "What was my childhood nickname?", options: [] },
      { question: "What's the biggest trouble I got into?", options: [] },
      { question: "What was my favorite toy growing up?", options: [] },
      { question: "What was I scared of as a kid?", options: [] }
    ]
  },
  {
    id: "dark_secrets",
    name: "Dark Secrets Edition",
    questions: [
      { question: "What's the deepest secret I've ever kept?", options: ["A lie I told", "A hidden relationship", "A financial mistake", "Something illegal"] },
      { question: "Who do I secretly dislike?", options: ["A coworker", "A family member", "A mutual friend", "An ex"] },
      { question: "What's my most embarrassing moment?", options: ["Public speaking fail", "Tripping in public", "Sending text to wrong person", "Wardrobe malfunction"] },
      { question: "What's a lie I tell often?", options: ["I'm fine", "I'm busy", "I love your outfit", "I'm almost there"] },
      { question: "What's my biggest regret?", options: ["Not taking a risk", "Hurting someone", "A bad relationship", "A lost opportunity"] },
      { question: "What is my most irrational fear?", options: ["Clowns", "Holes (trypophobia)", "The dark", "Mirrors at night"] },
      { question: "What's the worst thing I've ever done for revenge?", options: ["Spread a rumor", "Destroyed property", "Ghosted someone", "Petty sabotage"] },
      { question: "What do I secretly judge people for?", options: ["Their clothes", "Their intelligence", "Their hygiene", "Their taste in music"] },
      { question: "What is my biggest insecurity?", options: ["My appearance", "My intelligence", "My career", "My personality"] },
      { question: "If I could erased one memory, what would it be?", options: ["An embarrassing moment", "A bad relationship", "A childhood trauma", "A huge failure"] }
    ]
  },
  {
    id: "would_they_rather",
    name: "Would They Rather",
    questions: [
      { question: "Would I rather lose all my money or all my memories?", options: ["Money", "Memories", "Neither", "Both"] },
      { question: "Would I rather go to the past or the future?", options: ["Past", "Future", "Stay in present", "Alternate dimension"] },
      { question: "Would I rather never use the internet or never travel?", options: ["No internet", "No travel", "I can't choose", "Both"] },
      { question: "Would I rather be famous or wealthy and unknown?", options: ["Famous", "Wealthy & Unknown", "Neither", "Both"] },
      { question: "Would I rather be always 10 mins late or 20 mins early?", options: ["10 mins late", "20 mins early", "Right on time", "Never show up"] },
      { question: "Would I rather speak all languages or talk to animals?", options: ["Languages", "Animals", "Neither", "Mute"] },
      { question: "Would I rather fight 1 horse-sized duck or 100 duck-sized horses?", options: ["Horse-sized duck", "Duck-sized horses", "Run away", "Befriend them"] },
      { question: "Would I rather live in space or under the sea?", options: ["Space", "Under the sea", "Surface", "Underground"] },
      { question: "Would I rather lose my sense of taste or smell?", options: ["Taste", "Smell", "Neither", "Both"] },
      { question: "Would I rather have nosy neighbors or noisy neighbors?", options: ["Nosy", "Noisy", "Neither", "I am the bad neighbor"] }
    ]
  }
];

function seedQuestionSets() {
  QUESTION_SETS.forEach(set => {
    friendshipQuestionSets[set.id] = {
      ...set,
      isActive: true,
      createdAt: friendshipQuestionSets[set.id]?.createdAt || new Date().toISOString()
    };
  });
  saveData();
}

const QUESTION_POOL = [
  // Custom/General Questions
  { category: "custom", question: "What would I do if I won $10,000?", options: ["Travel the world", "Buy a car", "Save it", "Invest"] },
  { category: "custom", question: "What's my go-to comfort food?", options: ["Pizza", "Ice cream", "Pasta", "Burgers"] },
  { category: "custom", question: "What's my dream job?", options: ["Entrepreneur", "Artist", "Doctor", "Teacher"] },
  { category: "custom", question: "What would I do on a free Sunday?", options: ["Sleep in", "Hang with friends", "Watch movies", "Play games"] },
  { category: "custom", question: "What's my biggest pet peeve?", options: ["Loud chewing", "Being late", "Interrupting", "Messiness"] },
  { category: "custom", question: "What's my ideal vacation?", options: ["Beach resort", "Mountain cabin", "City exploration", "Road trip"] },
  { category: "custom", question: "What would I do in a zombie apocalypse?", options: ["Fight", "Hide", "Run", "Team up"] },
  { category: "custom", question: "What's my favorite way to relax?", options: ["Music", "Movies", "Gaming", "Reading"] },
  { category: "custom", question: "What's my favorite season?", options: ["Summer", "Winter", "Spring", "Autumn"] },
  { category: "custom", question: "What's my spirit animal?", options: ["Lion", "Dolphin", "Wolf", "Owl"] },

  // Dark Secrets (10 questions)
  { category: "dark_secrets", question: "What's the longest I've gone without showering?", options: ["1 day", "3 days", "A week", "Too embarrassed to say"] },
  { category: "dark_secrets", question: "What's my worst habit when nobody's looking?", options: ["Picking nose", "Talking to myself", "Stalking exes", "Eating bizarre combos"] },
  { category: "dark_secrets", question: "What white lie do I tell most often?", options: ["I'm on my way", "I didn't see your message", "I'm busy", "I love it"] },
  { category: "dark_secrets", question: "Have I ever ghosted someone?", options: ["Never", "Once", "Multiple times", "It's my lifestyle"] },
  { category: "dark_secrets", question: "What's my most irrational fear?", options: ["Clowns", "Holes (Trypophobia)", "The dark", "Open water"] },
  { category: "dark_secrets", question: "Have I ever stolen something small?", options: ["Never", "Candy as a kid", "Office supplies", "A lot"] },
  { category: "dark_secrets", question: "What's my most unpopular opinion?", options: ["Pineapple belongs on pizza", "Beyoncé is overrated", "Water is wet", "Cats are better than dogs"] },
  { category: "dark_secrets", question: "Which rule do I break most often?", options: ["Jaywalking", "Speeding", "Pirating movies", "Lying about age"] },
  { category: "dark_secrets", question: "What's the pettiest reason I ended a friendship?", options: ["Bad breath", "They didn't text back", "Owed me $5", "Annoying laugh"] },
  { category: "dark_secrets", question: "Who's my secret celebrity crush?", options: ["Danny DeVito", "Shrek", "Ryan Reynolds", "Pedro Pascal"] },

  // Would They Rather (10 questions)
  { category: "would_they_rather", question: "Would I rather...", options: ["Always be 10 minutes late", "Always be 20 minutes early", "Never show up at all", "Be precisely on time"] },
  { category: "would_they_rather", question: "Would I rather...", options: ["Give up social media", "Give up streaming movies/TV", "Give up music", "Give up video games"] },
  { category: "would_they_rather", question: "Would I rather...", options: ["Have the power of flight", "Have invisibility", "Teleportation", "Read minds"] },
  { category: "would_they_rather", question: "Would I rather...", options: ["Only eat spicy food", "Only eat sweet food", "Only eat bland food", "Only eat cold food"] },
  { category: "would_they_rather", question: "Would I rather...", options: ["Live in space", "Live under the ocean", "Live underground", "Live in an endless desert"] },
  { category: "would_they_rather", question: "Would I rather...", options: ["Lose my phone", "Lose my keys", "Lose my wallet", "Lose my pet"] },
  { category: "would_they_rather", question: "Would I rather...", options: ["Always speak my mind", "Never speak again", "Only whisper", "Only yell"] },
  { category: "would_they_rather", question: "Would I rather...", options: ["Fight 1 horse-sized duck", "Fight 100 duck-sized horses", "Run away", "Befriend them"] },
  { category: "would_they_rather", question: "Would I rather...", options: ["Win the lottery", "Find true love", "Cure a disease", "Live forever"] },
  { category: "would_they_rather", question: "Would I rather...", options: ["Have nosy neighbors", "Have noisy neighbors", "Have no neighbors", "Live with my parents forever"] },
  { category: "custom", question: "What's my favorite animal?", options: ["Dog", "Cat", "Lion", "Elephant"] },
  
  // Couples Edition
  { category: "couples", question: "What's my love language?", options: ["Words of affirmation", "Quality time", "Receiving gifts", "Acts of service"] },
  { category: "couples", question: "What's my ideal date night?", options: ["Dinner out", "Movie night", "Adventure", "Stay home"] },
  { category: "couples", question: "What's something I find romantic?", options: ["Flowers", "Surprises", "Handwritten notes", "Sunset walks"] },
  { category: "couples", question: "Where was our first date?", options: ["Cafe", "Restaurant", "Park", "Cinema"] },
  { category: "couples", question: "What's my favorite thing about you?", options: ["Smile", "Kindness", "Humor", "Intelligence"] },
  { category: "couples", question: "What's my dream wedding destination?", options: ["Beach", "Castle", "Garden", "City"] },
  { category: "couples", question: "How many kids do I want?", options: ["None", "One", "Two", "Three+"] },
  { category: "couples", question: "What's my favorite movie genre?", options: ["Romance", "Comedy", "Horror", "Action"] },
  { category: "couples", question: "What's my biggest turn-off?", options: ["Arrogance", "Laziness", "Dishonesty", "Rudeness"] },
  { category: "couples", question: "What's my favorite physical feature of yours?", options: ["Eyes", "Hair", "Hands", "Smile"] },
  
  // Best Friends Edition
  { category: "best_friends", question: "What's my childhood nickname?", options: ["None", "A funny name", "A family name", "A teasing name"] },
  { category: "best_friends", question: "What's my hidden talent?", options: ["Singing", "Dancing", "Cooking", "Drawing"] },
  { category: "best_friends", question: "What always makes me laugh?", options: ["Memes", "Puns", "Physical comedy", "Inside jokes"] },
  { category: "best_friends", question: "What's my favorite band/artist?", options: ["Pop", "Rock", "Hip Hop", "Indie"] },
  { category: "best_friends", question: "What's my favorite drink?", options: ["Coffee", "Tea", "Soda", "Juice"] },
  { category: "best_friends", question: "What's my biggest secret?", options: ["A crush", "A mistake", "A dream", "A fear"] },
  { category: "best_friends", question: "What's my favorite game?", options: ["FIFA", "Call of Duty", "Minecraft", "Among Us"] },
  { category: "best_friends", question: "What's my favorite social media?", options: ["Instagram", "TikTok", "X", "Snapchat"] },
  { category: "best_friends", question: "What's my favorite color?", options: ["Blue", "Red", "Black", "Green"] },
  { category: "best_friends", question: "What's my favorite sport?", options: ["Football", "Basketball", "Tennis", "Cricket"] },
  
  // Siblings Edition
  { category: "siblings", question: "What's my favorite childhood memory?", options: ["Family vacation", "Birthday party", "Holiday celebration", "First pet"] },
  { category: "siblings", question: "What was I like as a kid?", options: ["Shy", "Hyper", "Quiet", "Troublemaker"] },
  { category: "siblings", question: "Who was my favorite teacher?", options: ["Math", "English", "Science", "Sports"] },
  { category: "siblings", question: "What was my favorite subject?", options: ["Art", "History", "Geography", "Music"] },
  { category: "siblings", question: "What was my first pet's name?", options: ["Buddy", "Max", "Luna", "Charlie"] },
  { category: "siblings", question: "What was my dream job as a kid?", options: ["Astronaut", "Pilot", "Firefighter", "Police"] },
  { category: "siblings", question: "What was my favorite cartoon?", options: ["Tom & Jerry", "SpongeBob", "Ben 10", "Pokémon"] },
  { category: "siblings", question: "What was my favorite toy?", options: ["LEGO", "Barbie", "Hot Wheels", "Action Figure"] },
  { category: "siblings", question: "What was my biggest fear as a kid?", options: ["Dark", "Spiders", "Heights", "Clowns"] },
  { category: "siblings", question: "What was my favorite snack?", options: ["Chips", "Chocolate", "Fruit", "Cookies"] },

  // Dark Secrets Edition
  { category: "dark_secrets", question: "What's the deepest secret I've ever kept?", options: ["A lie I told", "A hidden relationship", "A financial mistake", "Something illegal"] },
  { category: "dark_secrets", question: "Who do I secretly dislike?", options: ["A coworker", "A family member", "A mutual friend", "An ex"] },
  { category: "dark_secrets", question: "What's my most embarrassing moment?", options: ["Public speaking fail", "Tripping in public", "Sending text to wrong person", "Wardrobe malfunction"] },
  { category: "dark_secrets", question: "What's a lie I tell often?", options: ["I'm fine", "I'm busy", "I love your outfit", "I'm almost there"] },
  { category: "dark_secrets", question: "What's my biggest regret?", options: ["Not taking a risk", "Hurting someone", "A bad relationship", "A lost opportunity"] },
  { category: "dark_secrets", question: "What is my most irrational fear?", options: ["Clowns", "Holes (trypophobia)", "The dark", "Mirrors at night"] },
  { category: "dark_secrets", question: "What's the worst thing I've ever done for revenge?", options: ["Spread a rumor", "Destroyed property", "Ghosted someone", "Petty sabotage"] },
  { category: "dark_secrets", question: "What do I secretly judge people for?", options: ["Their clothes", "Their intelligence", "Their hygiene", "Their taste in music"] },
  { category: "dark_secrets", question: "What is my biggest insecurity?", options: ["My appearance", "My intelligence", "My career", "My personality"] },
  { category: "dark_secrets", question: "If I could erased one memory, what would it be?", options: ["An embarrassing moment", "A bad relationship", "A childhood trauma", "A huge failure"] },

  // Would They Rather
  { category: "would_they_rather", question: "Would I rather lose all my money or all my memories?", options: ["Money", "Memories", "Neither", "Both"] },
  { category: "would_they_rather", question: "Would I rather go to the past or the future?", options: ["Past", "Future", "Stay in present", "Alternate dimension"] },
  { category: "would_they_rather", question: "Would I rather never use the internet or never travel?", options: ["No internet", "No travel", "I can't choose", "Both"] },
  { category: "would_they_rather", question: "Would I rather be famous or wealthy and unknown?", options: ["Famous", "Wealthy & Unknown", "Neither", "Both"] },
  { category: "would_they_rather", question: "Would I rather be always 10 mins late or 20 mins early?", options: ["10 mins late", "20 mins early", "Right on time", "Never show up"] },
  { category: "would_they_rather", question: "Would I rather speak all languages or talk to animals?", options: ["Languages", "Animals", "Neither", "Mute"] },
  { category: "would_they_rather", question: "Would I rather fight 1 horse-sized duck or 100 duck-sized horses?", options: ["Horse-sized duck", "Duck-sized horses", "Run away", "Befriend them"] },
  { category: "would_they_rather", question: "Would I rather live in space or under the sea?", options: ["Space", "Under the sea", "Surface", "Underground"] },
  { category: "would_they_rather", question: "Would I rather lose my sense of taste or smell?", options: ["Taste", "Smell", "Neither", "Both"] },
  { category: "would_they_rather", question: "Would I rather have nosy neighbors or noisy neighbors?", options: ["Nosy", "Noisy", "Neither", "I am the bad neighbor"] }
];

async function startServer() {
  loadData();
  
  // Seed pool if empty
  friendshipQuestionPool = QUESTION_POOL.map((q, idx) => ({ ...q, id: `q_${idx}` }));
  saveData();

  seedQuestionSets();
  
  process.on('uncaughtException', (err) => {
    try {
      fs.appendFileSync('server-crash.log', new Date().toISOString() + ' Uncaught Exception: ' + err.stack + '\n');
    } catch(e) {}
  });

  process.on('unhandledRejection', (reason, promise) => {
    try {
      fs.appendFileSync('server-crash.log', new Date().toISOString() + ' Unhandled Rejection: ' + String(reason) + '\n');
    } catch(e) {}
  });

  const app = express();
  const PORT = 3000;

  app.get("/api/health", (req, res) => {
    const health = getFirebaseHealth();
    res.json({ 
      status: health.healthy ? "ok" : "degraded",
      firebase: health,
      timestamp: new Date().toISOString()
    });
  });

  // Trust proxy is required for express-rate-limit to work correctly behind a proxy (like Nginx/Cloud Run)
  // This fixes the "X-Forwarded-For" and "Forwarded" header validation errors.
  app.set('trust proxy', 1);

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for Vite dev server compatibility
    crossOriginEmbedderPolicy: false
  }));

  // Gzip compression for faster delivery
  app.use(compression());
  
  // Serve static files from public directory (for runtime temp files)
  app.use(express.static(path.join(process.cwd(), "public")));

  // Rate limiting to prevent abuse
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 1000, // Limit each IP to 1000 requests per window
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Explicitly validate that we're getting the IP from the proxy
    validate: { trustProxy: true },
    message: { error: "Too many requests, please try again later." }
  });
  app.use("/api/", limiter);

  // Middleware to verify Firebase ID Token (Using central auth utility)
  const authenticate = async (req: any, res: any, next: any) => {
    try {
      await authenticateMiddleware(req, res, async () => {
        const userId = req.user.uid;
        if (!users[userId]) {
          try {
            const dbInstance = getDb();
            const userDoc = await dbInstance.collection('users').doc(userId).get();
            if (userDoc.exists) {
              users[userId] = userDoc.data();
              if (users[userId].username) {
                usernameToId[users[userId].username.toLowerCase()] = userId;
              }
              console.log(`[Auth Wrapper] Lazy-loaded user ${userId} to memory cache`);
            } else {
              // Initialize a skeleton user if they don't exist in DB yet
              // This is safe because they are authenticated via Firebase
              users[userId] = { 
                id: userId, 
                totalShares: 0, 
                totalRoasts: 0, 
                coinBalance: 0, 
                totalCoinsEarned: 0, 
                rmpBalance: 0, 
                totalRMPEarned: 0, 
                viewCount: 0,
                isActive: true,
                isBanned: false,
                username: req.user.displayName || 'roaster'
              };
              console.log(`[Auth Wrapper] Created skeleton user for ${userId} in memory`);
            }
          } catch (e) {
            console.error(`[Auth Wrapper] Failed to lazy-load user ${userId}:`, e);
            // Fallback skeleton
            if (!users[userId]) {
              users[userId] = { id: userId, totalShares: 0, totalRoasts: 0, coinBalance: 0, totalCoinsEarned: 0, rmpBalance: 0, totalRMPEarned: 0, viewCount: 0 };
            }
          }
        }
        await next();
      });
    } catch (err) {
      console.error('[Auth Wrapper] Fatal error:', err);
      res.status(500).json({ error: 'Authentication internal error' });
    }
  };

  app.use(express.json({ limit: '50mb' })); // Increased limit for camera photos
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use(socialUpgradesRouter);

  // RMP System Helpers
  function awardRMP(userId: string, amount: number, type: string, description: string, relatedId?: string) {
    // Overhaul: also award in Firestore
    addRMP(userId, amount, type, description, relatedId).catch(err => console.error("Firestore RMP error:", err));

    if (!users[userId]) {
      users[userId] = { id: userId, totalShares: 0, totalRoasts: 0, coinBalance: 0, totalCoinsEarned: 0, rmpBalance: 0, totalRMPEarned: 0, viewCount: 0 };
    }
    
    users[userId].rmpBalance = (users[userId].rmpBalance || 0) + amount;
    users[userId].totalRMPEarned = (users[userId].totalRMPEarned || 0) + amount;
    
    const transaction = {
      id: Math.random().toString(36).substr(2, 9),
      userId,
      type,
      amount,
      balance: users[userId].rmpBalance,
      description,
      relatedId,
      createdAt: new Date().toISOString()
    };
    
    rmpTransactions.push(transaction);
    saveData();
    return users[userId].rmpBalance;
  }

  // Auth & Economy Helpers
  function generateReferralCode(username: string): string {
    const random = Math.random().toString(36).substring(2, 8);
    return `${username.substring(0, 5)}${random}`.toLowerCase();
  }

  // Check if username is available
  app.get("/api/auth/check-username/:username?", async (req, res) => {
    const { username } = req.params;
    
    if (!username || username.trim() === "") {
      return res.json({ available: true }); // Default to true for blank check (handled by frontend)
    }

    const usernameLower = username.toLowerCase().trim();

    try {
      const dbInstance = getDb();
      const usernameCheck = await dbInstance.collection('users').where('usernameLower', '==', usernameLower).get();
      
      if (!usernameCheck.empty) {
        return res.json({ available: false });
      }

      return res.json({ available: true });
    } catch (error) {
      console.error('[Username Check] Error:', error);
      res.status(500).json({ error: 'Failed to check username' });
    }
  });

  // Sync profile after client-side registration/login
  app.post("/api/auth/sync", async (req, res) => {
    let { idToken, username, referralCode } = req.body;
    
    // Fallback to headers if not in body
    if (!idToken && req.headers.authorization) {
      idToken = req.headers.authorization.split(' ')[1];
    }

    if (!idToken) {
      return res.status(401).json({ error: 'Authentication token required' });
    }

    try {
      const currentAuth = getAuth();
      const decodedToken = await currentAuth.verifyIdToken(idToken);
      const uid = decodedToken.uid;
      
      const dbInstance = getDb();
      
      // LAZY LOAD USER TO LOCAL MAP IF MISSING
      if (!users[uid]) {
        try {
          const userDoc = await dbInstance.collection('users').doc(uid).get();
          if (userDoc.exists) {
            users[uid] = userDoc.data();
            if (users[uid].username) {
              usernameToId[users[uid].username.toLowerCase()] = uid;
            }
            console.log(`[Sync] Lazy-loaded existing user ${uid} to memory`);
          }
        } catch (e) {
          console.error(`[Sync] Failed to lazy-load user ${uid}:`, e);
        }
      }

      const userRef = dbInstance.collection('users').doc(uid);
      const userDoc = await userRef.get();

      console.log(`[Sync] Processing sync for UID: ${uid}, New User: ${!userDoc.exists}`);

      if (!userDoc.exists) {
        // ... (existing new user logic)
        if (!username) {
          return res.status(400).json({ error: 'Username required for new profile' });
        }

        const trimmedUsername = username.trim();
        const usernameLower = trimmedUsername.toLowerCase();

        // One last check for username uniqueness
        const usernameCheck = await dbInstance.collection('users').where('usernameLower', '==', usernameLower).get();
        if (!usernameCheck.empty) {
          return res.status(409).json({ error: 'Username already taken' });
        }

        const userReferralCode = generateReferralCode(trimmedUsername);
        
        const newUser = {
          id: uid,
          username: trimmedUsername,
          usernameLower,
          referralCode: userReferralCode,
          referredBy: referralCode || null,
          rmpBalance: 0,
          coinBalance: 0,
          totalRMPEarned: 0,
          totalCoinsEarned: 0,
          usdEarned: 0,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          streakCount: 1,
          notificationsEnabled: true
        };

        // Convert to Firestore friendly (removing JS dates if needed, though ISO strings are fine)
        const firestoreUser = {
          ...newUser,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await userRef.set(firestoreUser);
        
        // Update local map IMMEDIATELY to prevent 403s
        users[uid] = newUser;
        usernameToId[usernameLower] = uid;
        
        // Award welcome bonus
        try {
          await addRMP(uid, REWARDS.WELCOME_BONUS, 'WELCOME_BONUS', 'Welcome to RoastMe! Start earning by roasting.');
        } catch (e) { console.error('Bonus error:', e); }

        // Handle referral
        if (referralCode) {
          const referrerQuery = await dbInstance.collection('users').where('referralCode', '==', referralCode).get();
          if (!referrerQuery.empty) {
            const referrerDoc = referrerQuery.docs[0];
            await addRMP(referrerDoc.id, REWARDS.REFERRAL_SIGNUP, 'REFERRAL_SIGNUP', `User ${trimmedUsername} signed up with your link`);
            
            await dbInstance.collection('referrals').add({
              referrerId: referrerDoc.id,
              referredId: uid,
              referredUsername: trimmedUsername,
              status: 'pending',
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        }

        return res.json({ success: true, newUser: true, user: newUser });
      } else {
        // User exists, handle daily login and streak
        const userData = userDoc.data()!;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastLogin = userData.lastLoginAt?.toDate();
        const lastMidnight = lastLogin ? new Date(lastLogin) : null;
        if (lastMidnight) lastMidnight.setHours(0, 0, 0, 0);

        let streakCount = userData.streakCount || 0;
        let streakFrozen = false;

        if (!lastMidnight || lastMidnight.getTime() !== today.getTime()) {
          const diffDays = lastMidnight ? Math.floor((today.getTime() - lastMidnight.getTime()) / (1000 * 60 * 60 * 24)) : 999;
          
          if (diffDays === 1) {
            streakCount++;
          } else if (diffDays > 1) {
            // CHECK AUTO-FREEZE
            const freezeCount = userData.streakFreezeAvailable || 0;
            if (freezeCount > 0) {
              streakFrozen = true;
              // User gets to keep their streak! No increment, but no reset.
              await userRef.update({
                streakFreezeAvailable: admin.firestore.FieldValue.increment(-1),
                streakFrozen: true // mark as frozen for the day
              });
              console.log(`[Streak] Auto-freeze applied for user ${uid}. Remaining: ${freezeCount - 1}`);
            } else {
              streakCount = 1;
              await userRef.update({ streakFrozen: false });
            }
          }
        }

        const updateData = {
          lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
          streakCount: streakCount,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await userRef.update(updateData);

        // Sync with roastProfiles for frontend display compatibility
        try {
          await dbInstance.collection('roastProfiles').doc(uid).set({
            streakCount: streakCount,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        } catch (syncErr) {
          console.error("RoastProfile sync error:", syncErr);
        }

        // Update local map cache
        users[uid] = { 
          ...users[uid], 
          ...userData,
          streakCount: streakCount,
          lastLoginAt: new Date().toISOString()
        };

        // Also update the dedicated userStreaks if it exists to keep them in sync
        if (userStreaks[uid]) {
          const lastActive = new Date(userStreaks[uid].lastActiveDate);
          lastActive.setHours(0, 0, 0, 0);
          const t = new Date(); t.setHours(0, 0, 0, 0);
          if (t.getTime() - lastActive.getTime() === 86400000) {
             // Incremented in sync logic, can update userStreaks too
             userStreaks[uid].currentStreak = streakCount;
             userStreaks[uid].lastActiveDate = t.toISOString();
             userStreaks[uid].longestStreak = Math.max(userStreaks[uid].longestStreak, streakCount);
          } else if (t.getTime() - lastActive.getTime() > 86400000) {
             userStreaks[uid].currentStreak = streakCount;
             userStreaks[uid].lastActiveDate = t.toISOString();
          }
        }

        return res.json({ 
          success: true, 
          newUser: false, 
          user: users[uid]
        });
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      res.status(500).json({ error: 'Profile sync failed' });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, email, name, referralCode } = req.body;

      if (!username || username.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters' });
      }
      
      if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const { user, token } = await userService.createUser(username, password, email, name, referralCode);

      // Return user info and custom token for client-side sign-in
      return res.status(201).json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          coinBalance: user.coinBalance,
          rmpBalance: user.rmpBalance,
          referralCode: user.referralCode,
        },
        token,
        message: 'Account created successfully!',
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      return res.status(500).json({ error: 'Failed to create account. Please try again.' });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      const { user, token } = await userService.authenticateUser(username, password);
      const stats = await economyService.getUserEconomyStats(user.id);

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          coinBalance: user.coinBalance,
          rmpBalance: user.rmpBalance,
          referralCode: user.referralCode,
          stats,
        },
        token
      });
    } catch (error: any) {
      console.error('Login error:', error);
      return res.status(401).json({ error: 'Invalid username or password' });
    }
  });

  app.get("/api/user/roast-tier", authenticate, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const user = users[userId];
      const totalRoasts = user?.totalRoasts || 0;
      const battleWins = user?.battleWins || 0;
      const battleLosses = user?.battleLosses || 0;
      const totalBattles = battleWins + battleLosses;
      const winRate = totalBattles > 0 ? Math.round((battleWins / totalBattles) * 100) : 0;
      const tierInfo = getUserRoastTierFromStats(totalRoasts, battleWins);
      res.json({
          tier: tierInfo.tier,
          tierProgress: tierInfo.progress,
          winRate,
          totalRoasts
      });
    } catch (error) {
      console.error('roast-stats error:', error);
      res.status(500).json({ error: 'Failed to fetch roast stats' });
    }
  });

  app.get("/api/user/economy", authenticate, async (req: any, res) => {
    try {
      const stats = await economyService.getUserEconomyStats(req.user.uid);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch economy stats' });
    }
  });

  app.post("/api/user/withdraw", authenticate, async (req: any, res) => {
    const { amount, method, address } = req.body; // amount is in coins
    const userId = req.user.uid;

    if (!amount || amount < ECONOMY.MINIMUM_WITHDRAWAL) {
      return res.status(400).json({ error: `Minimum withdrawal is ${ECONOMY.MINIMUM_WITHDRAWAL} coins` });
    }

    if (!method || !address) {
      return res.status(400).json({ error: 'Method and address required' });
    }

    try {
      const dbInstance = getDb();
      if (!dbInstance) throw new Error("Firestore not initialized");

      const userRef = dbInstance.collection('users').doc(userId);
      
      await dbInstance.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) throw new Error('User not found');
        
        const userData = userDoc.data() || {};
        const coinBalance = userData.coinBalance || 0;
        
        if (coinBalance < amount) {
          throw new Error('Insufficient coins');
        }

        const withdrawalRef = dbInstance.collection('withdrawals').doc();
        transaction.set(withdrawalRef, {
          id: withdrawalRef.id,
          userId,
          amount,
          usdAmount: amount * ECONOMY.DEFAULT_RATE,
          method,
          address,
          status: 'pending',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        transaction.update(userRef, {
          coinBalance: admin.firestore.FieldValue.increment(-amount),
          totalWithdrawn: admin.firestore.FieldValue.increment(amount),
          pendingWithdrawal: admin.firestore.FieldValue.increment(amount)
        });

        const coinTxRef = dbInstance.collection('coin_transactions').doc();
        transaction.set(coinTxRef, {
          id: coinTxRef.id,
          userId,
          amount: -amount,
          type: 'WITHDRAWAL_REQUEST',
          description: `Withdrawal request for ${amount} coins`,
          balanceAfter: coinBalance - amount,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      res.json({ success: true, message: 'Withdrawal request submitted' });
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      res.status(400).json({ error: 'Withdrawal failed. Your balance might be insufficient.' });
    }
  });

  app.post("/api/activity/share-click", async (req, res) => {
    const { linkId, linkType, referrerId, targetUserId } = req.body;
    
    try {
      if (referrerId) {
        await addRMP(referrerId, REWARDS.ROAST_SHARE_CLICK, 'SHARE_CLICK', `Someone clicked your ${linkType || 'shared'} link`);
      }
      
      // Referral completion logic
      if (targetUserId && referrerId) {
        const dbInstance = getDb();
        if (dbInstance) {
          const referralQuery = await dbInstance.collection('referrals')
            .where('referrerId', '==', referrerId)
            .where('referredId', '==', targetUserId)
            .where('status', '==', 'pending')
            .get();
          
          if (!referralQuery.empty) {
            const refDoc = referralQuery.docs[0];
            await refDoc.ref.update({
              status: 'completed',
              completedAt: admin.firestore.FieldValue.serverTimestamp(),
              rewardPaid: true
            });
            
            await addRMP(referrerId, REWARDS.REFERRAL_COMPLETE, 'REFERRAL_COMPLETE', 'Your referral completed their first action');
          }
        }
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Track share click error:', error);
      res.status(500).json({ error: 'Failed to track share click' });
    }
  });

  // RMP to Coins Conversion API
  app.post("/api/rmp/convert", authenticate, (req: any, res) => {
    const userId = req.user.uid;
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ error: 'Amount required' });

    const user = users[userId];
    if (!user || (user.rmpBalance || 0) < amount) {
      return res.status(400).json({ error: 'Insufficient RMP' });
    }

    const coinsToAdd = Math.floor(amount / 100);
    const rmpToDeduct = coinsToAdd * 100;

    if (coinsToAdd <= 0) {
      return res.status(400).json({ error: 'Minimum 100 RMP required for conversion' });
    }

    user.rmpBalance -= rmpToDeduct;
    user.coinBalance = (user.coinBalance || 0) + coinsToAdd;
    user.totalCoinsEarned = (user.totalCoinsEarned || 0) + coinsToAdd;

    // Record RMP transaction
    rmpTransactions.push({
      id: Math.random().toString(36).substr(2, 9),
      userId,
      type: 'CONVERSION',
      amount: -rmpToDeduct,
      balance: user.rmpBalance,
      description: `Converted ${rmpToDeduct} RMP to ${coinsToAdd} coins`,
      createdAt: new Date().toISOString()
    });

    // Record coin transaction
    coinTransactions.push({
      id: Math.random().toString(36).substr(2, 9),
      userId,
      type: 'CONVERSION',
      amount: coinsToAdd,
      balance: user.coinBalance,
      description: `Converted ${rmpToDeduct} RMP to ${coinsToAdd} coins`,
      createdAt: new Date().toISOString()
    });

    res.json({
      success: true,
      coinsAdded: coinsToAdd,
      newRMP: user.rmpBalance,
      newCoins: user.coinBalance
    });
    saveData();
  });

  // --- RETENTION & ENGAGEMENT API ---

  // Daily Spin Wheel
  app.post("/api/spin/daily", authenticate, async (req: any, res: any) => {
    try {
      const result = await economyService.dailySpin(req.user.uid);
      res.json({ success: true, reward: result });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Buy Streak Freeze
  app.post("/api/streak/buy-freeze", authenticate, async (req: any, res: any) => {
    try {
      await economyService.buyStreakFreeze(req.user.uid);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Referral Ladder
  app.get("/api/referrals/ladder", authenticate, async (req: any, res: any) => {
    try {
      const result = await economyService.updateReferralLadder(req.user.uid);
      res.json({ success: true, ladder: result });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Profile Customization
  app.post("/api/user/customize", authenticate, async (req: any, res: any) => {
    try {
      const { type, itemId } = req.body;
      if (!type || !itemId) throw new Error("Type and ItemId required");
      await economyService.customizeProfile(req.user.uid, type, itemId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get User RMP
  app.get("/api/user/rmp", authenticate, (req: any, res) => {
    const userId = req.user.uid;

    const user = users[userId];
    res.json({
      rmpBalance: user?.rmpBalance || 0,
      totalRMPEarned: user?.totalRMPEarned || 0
    });
  });

  // Resolve Roast (by ID or Username)
  app.get("/api/roast/resolve/:identifier", (req, res) => {
    const { identifier } = req.params;
    const formattedIdentifier = identifier.toLowerCase();

    // Check if identifier is a username (short link)
    if (shortLinks[formattedIdentifier]) {
      const roast = roasts[shortLinks[formattedIdentifier].roastId];
      if (roast) {
        return res.json({
          roast,
          isShortLink: true,
          username: formattedIdentifier
        });
      }
    }

    // Check if identifier is a roast ID
    const roast = roasts[identifier];
    if (roast) {
      return res.json({
        roast,
        isShortLink: false
      });
    }

    res.status(404).json({ error: 'Roast not found' });
  });

  // Roast Cache Check (Client will generate if cache miss)
  function findCachedRoast(input: string, mode: string) {
    const normalizedInput = (input || "").toLowerCase().trim();
    if (!normalizedInput || normalizedInput.length < 5) return null;
    
    return roastCache.find(c => 
      c.mode === mode && 
      (normalizedInput.includes(c.input.toLowerCase()) || c.input.toLowerCase().includes(normalizedInput))
    );
  }

  function applyTwist(text: string) {
    const twists = [
      (t: string) => t.replace(/\b(is|are)\b/g, "literally $1"),
      (t: string) => t + " 🔥",
      (t: string) => t.replace(/\b(you|your)\b/gi, (m) => m.toUpperCase()),
      (t: string) => "Listen, " + t.charAt(0).toLowerCase() + t.slice(1),
      (t: string) => t.replace(/\./g, "!"),
      (t: string) => t.replace(/\b(good|great|amazing)\b/gi, "LEGENDARY"),
    ];
    const randomTwist = twists[Math.floor(Math.random() * twists.length)];
    return randomTwist(text);
  }

  app.post("/api/roasts/check-cache", authenticate, async (req: any, res) => {
    const { input, mode, generationCount } = req.body;
    
    // Speed/Delay logic: minor delay to feel natural but not frustrating
    if (generationCount > 0) {
      await new Promise(resolve => setTimeout(resolve, 500)); 
    }

    // Never use cache if they are actively trying to generate a new one (generationCount > 0)
    if (generationCount === 0) {
      const cached = findCachedRoast(input, mode);
      if (cached) {
        console.log(`[CACHE] Hit for input: ${input}`);
        return res.json({ 
          found: true,
          text: applyTwist(cached.output)
        });
      }
    }

    res.json({ found: false });
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // HELPER: Unified Roast Generation (Merging v1 and v2)
  async function generateRoastUnified(userId: string, options: any) {
    let { 
      inputType = 'text', 
      inputContent = '', 
      persona = 'comedian', 
      intensity, 
      sessionCount = 0,
      target,
      targetDescription,
      photo,
      publishToFeed,
      shareAnonymously,
      mode = 'roast',
      theme,
      roastStyle,
      languageComplexity
    } = options;

    const user = users[userId];
    const userProfile = await getRoastProfile(userId);
    
    // Auto Settings integration (mimicking v1 legacy behavior)
    if (!intensity || !theme || !roastStyle || !languageComplexity) {
      const roastHistoryTexts = Object.values(roasts)
        .filter((r: any) => r.userId === userId)
        .slice(-10)
        .map((r: any) => r.text);
        
      const challengesCompleted = user?.totalBattlesWon || 0;
      const totalChallenges = (user?.totalBattlesWon || 0) + (user?.totalBattlesLost || 0);
      const reportedOffensive = 0; 

      const settings = getAutomatedSettingsForUser(user, roastHistoryTexts, challengesCompleted, totalChallenges, reportedOffensive);
      
      intensity = intensity || settings.intensity;
      theme = theme || settings.theme;
      roastStyle = roastStyle || settings.roastStyle;
      languageComplexity = languageComplexity || settings.languageComplexity;
    }

    // Format target (v1 logic)
    let formattedTarget = target && target !== 'someone' && target !== 'friend' 
      ? target.trim() 
      : 'you';

    if (target && target !== 'someone' && target.includes('who is')) {
      const parts = target.split('who is');
      formattedTarget = parts[0].trim();
      targetDescription = (targetDescription || '') + ' ' + parts[1].trim();
    }

    const { systemPrompt, userPrompt } = buildRoastPrompt({
      inputType,
      inputContent,
      persona,
      intensity,
      userProfile,
      sessionCount,
      target: formattedTarget,
      targetDescription,
      mode,
      theme,
      roastStyle,
      languageComplexity
    });

    let roastText = await callGeminiRoast({ systemPrompt, userPrompt });
    
    // TEMPLATE ENGINE Integration (v2 enhancement)
    // If Gemini fails or for specific v2 requests, we use the library
    if (!roastText) {
      console.log("[v2-Engine] Using template library for:", formattedTarget);
      // We'll import deliverRoast dynamically or just use a local implementation
      // For now, I'll use the fallback engine getRoast which is already there,
      // but I should add the template logic here too if I want it truly unified.
      
      const intensityMap: Record<string, string> = {
        'friendly': 'mild',
        'roasted': 'medium',
        'savage': 'brutal',
        'scorched': 'brutal'
      };
      
      const mappedIntensity = intensityMap[intensity] || 'medium';

      const fallbackResult = await getRoast({
        target: formattedTarget,
        targetDescription,
        intensity: mappedIntensity as any,
        roastType: roastStyle as any || 'comeback',
        languageComplexity: languageComplexity as any || 'standard',
        theme
      });
      roastText = fallbackResult.roast;
    }
    
    // Scoring (v1 logic)
    const score = scoreRoast(roastText, intensity);
    
    // Save to Firestore (v2 primary storage)
    const sessionId = await saveRoastSession({
      userId,
      inputType,
      inputContent,
      persona,
      intensity,
      roastText,
      target: formattedTarget,
      targetDescription,
      photoUrl: photo || "",
      theme,
      roastStyle,
      languageComplexity,
      mode,
      isPublic: publishToFeed || false,
      shareAnonymously: shareAnonymously || false,
      ...score
    });

    // Record in global memory map (v1 legacy compatibility)
    roasts[sessionId] = {
      id: sessionId,
      text: roastText,
      userId,
      username: shareAnonymously ? 'anonymous' : (user?.username || 'anonymous'),
      createdAt: new Date().toISOString(),
      isPublic: publishToFeed || false,
      ...score,
      intensity,
      theme,
      source: 'gemini'
    };

    // Update in-memory user counters
    if (user) {
      user.totalRoasts = (user.totalRoasts || 0) + 1;
    }

    // Award rewards & Update Quests (Merged rewards)
    let rewardsAwarded = { rmp: 0, questCompleted: false };
    try {
      const rmpAmount = REWARDS.ROAST_CREATE_EXTRA || 5;
      await awardRMP(userId, rmpAmount, 'ROAST_UNIFIED', `Generated a ${intensity} roast using ${persona} persona`, sessionId);
      rewardsAwarded.rmp = rmpAmount;
      
      updateMonthlyStats(userId, { roasts: 1 });
      
      const questData = dailyQuestsData[userId];
      const wasCompleted = questData?.quests?.roast;
      await updateQuestProgress(userId, 'roast');
      if (!wasCompleted && dailyQuestsData[userId]?.quests?.roast) {
        rewardsAwarded.questCompleted = true;
      }
    } catch (rewardErr) {
      console.error("Unified roast reward error:", rewardErr);
    }

    return { sessionId, roastText, rewards: rewardsAwarded, score };
  }

  // ROAST GENERATION API - Server Side (v1 legacy endpoint aliased to unified)
  app.post("/api/generate-roast", authenticate, async (req: any, res) => {
    try {
      const result = await generateRoastUnified(req.user.uid, req.body);
      const roastData = {
        ...roasts[result.sessionId],
        rmpAwarded: result.rewards.rmp,
        questCompleted: result.rewards.questCompleted
      };
      
      res.json({ 
        success: true,
        roast: roastData
      });
    } catch (err: any) {
      console.error("Generate Roast Error:", err);
      const fallbackText = generatePremiumRoast({ target: 'you', intensity: 'medium', roastType: 'comeback' });
      const sessionId = Math.random().toString(36).substring(2, 15);
      res.json({ 
        success: true,
        roast: {
          id: sessionId,
          text: fallbackText,
          userId: req.user?.uid || 'guest',
          username: 'roaster',
          createdAt: new Date().toISOString(),
          score: 85,
          rating: 'Roasted',
          intensity: 'medium',
          source: 'fallback'
        }
      });
    }
  });

  // Username Check
  app.post("/api/username/check", (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });
    
    const validation = validateUsername(username);
    if (!validation.isValid) return res.status(400).json({ error: validation.error });

    const formattedUsername = username.trim().toLowerCase();
    const existingUserId = usernameToId[formattedUsername];
    const existingInAnonymous = anonymousInboxes[formattedUsername] !== undefined;

    if (existingUserId || existingInAnonymous) {
      const suffixes = ['1', '2', '3', '4', '5', 'roast', 'fire', 'lit', 'goat', 'king', 'queen'];
      const randomSuffix = suffixes[Math.floor(Math.random() * suffixes.length)];
      return res.json({ 
        available: false, 
        error: 'Username taken', 
        suggestion: `${formattedUsername}_${randomSuffix}` 
      });
    }

    res.json({ available: true, username: formattedUsername });
  });

  // Create/Update Username
  app.post("/api/username/create", authenticate, (req: any, res) => {
    const { username, bio, avatarUrl } = req.body;
    const userId = req.user.uid;
    
    if (!username) return res.status(400).json({ error: 'Username required' });

    const validation = validateUsername(username);
    if (!validation.isValid) return res.status(400).json({ error: validation.error });

    const formattedUsername = username.trim().toLowerCase();
    const roastboardSlug = generateRoastboardSlug(formattedUsername);

    // Check if taken by someone else
    const existingUserId = usernameToId[formattedUsername];
    if (existingUserId && existingUserId !== userId) return res.status(409).json({ error: 'Username already taken' });

    if (!users[userId]) {
      users[userId] = { id: userId, totalShares: 0, totalRoasts: 0, coinBalance: 0, totalCoinsEarned: 0, rmpBalance: 0, totalRMPEarned: 0, viewCount: 0 };
    }

    const oldUsername = users[userId].username;
    if (oldUsername && oldUsername.toLowerCase() !== formattedUsername) {
      usernameHistory.push({ userId, oldUsername, newUsername: formattedUsername, changedAt: new Date().toISOString() });
      delete usernameToId[oldUsername.toLowerCase()];
    }

    users[userId].username = formattedUsername;
    users[userId].usernameLower = formattedUsername;
    users[userId].roastboardSlug = roastboardSlug;
    users[userId].bio = bio || users[userId].bio || null;
    users[userId].avatarUrl = avatarUrl || users[userId].avatarUrl || null;
    users[userId].usernameLastSeen = new Date().toISOString();
    if (!users[userId].usernameCreatedAt) users[userId].usernameCreatedAt = new Date().toISOString();
    
    usernameToId[formattedUsername] = userId;

    saveData();
    res.json({ 
      success: true, 
      username: formattedUsername, 
      roastboardSlug,
      bio: users[userId].bio,
      avatarUrl: users[userId].avatarUrl
    });
  });

  // Short Link API
  app.post("/api/shorten", authenticate, (req: any, res) => {
    const { username, roastId } = req.body;
    const userId = req.user.uid;
    if (!username || !roastId) return res.status(400).json({ error: 'Username and roastId required' });

    const user = users[userId];
    if (!user) return res.status(403).json({ error: 'Unauthorized' });

    const formattedUsername = username.trim().toLowerCase();
    const userHandle = (user.username || 'anonymous').toLowerCase();

    // Allow shortening if it matches their set username or if they are using the default/anonymous handle
    if (userHandle !== formattedUsername && formattedUsername !== 'roaster' && formattedUsername !== 'anonymous') {
      console.warn(`Shorten 403: User ${userId} (${userHandle}) tried to shorten for ${formattedUsername}`);
      return res.status(403).json({ error: 'Unauthorized' });
    }

    shortLinks[formattedUsername] = {
      username: formattedUsername,
      roastId,
      userId: user.id,
      slug: formattedUsername,
      clicks: (shortLinks[formattedUsername]?.clicks || 0),
      updatedAt: new Date().toISOString(),
      createdAt: shortLinks[formattedUsername]?.createdAt || new Date().toISOString()
    };

    const host = process.env.APP_URL || 'https://roastme.site';
    res.json({
      shortUrl: `${host}/roast/${formattedUsername}`,
      username: formattedUsername
    });
  });

  // Track Short Link Clicks
  app.post("/api/shorten/clicks", (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });
    
    const formattedUsername = username.toLowerCase();
    if (shortLinks[formattedUsername]) {
      shortLinks[formattedUsername].clicks++;
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Short link not found' });
    }
  });

  // Resolve Roast (by ID or Username)
  app.get("/api/roast/resolve/:identifier", (req, res) => {
    const { identifier } = req.params;
    const formattedIdentifier = identifier.toLowerCase();

    // Check if identifier is a username (short link)
    if (shortLinks[formattedIdentifier]) {
      const roast = roasts[shortLinks[formattedIdentifier].roastId];
      if (roast) {
        return res.json({
          roast,
          isShortLink: true,
          username: formattedIdentifier
        });
      }
    }

    // Check if identifier is a roast ID
    const roast = roasts[identifier];
    if (roast) {
      return res.json({
        roast,
        isShortLink: false
      });
    }

    res.status(404).json({ error: 'Roast not found' });
  });

  // Coin Balance
  app.get("/api/coins/balance", authenticate, (req: any, res) => {
    const userId = req.user.uid;

    const user = users[userId];
    res.json({
      balance: user?.coinBalance || 0,
      totalEarned: user?.totalCoinsEarned || 0
    });
  });

  // Coin History
  app.get("/api/coins/history", authenticate, (req: any, res) => {
    const userId = req.user.uid;

    const history = coinTransactions
      .filter(tx => tx.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);

    res.json({ history });
  });

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      firebaseAdmin: !!admin.apps.length,
      uptime: process.uptime()
    });
  });

  // Truth or Dare Invite Endpoints
  app.post("/api/truthordare/invite/create", authenticate, (req: any, res) => {
    const userId = req.user.uid;
    const username = users[userId]?.username || "anonymous";
    const inviteCode = Math.random().toString(36).substr(2, 12);
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    todInvites[inviteCode] = {
      code: inviteCode,
      challengerId: userId,
      challengerName: username,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    saveData();
    res.json({ 
      success: true, 
      inviteCode,
      inviteLink: `/tod/${username}/${inviteCode}`,
      message: `@${username} has invited you to a Truth or Dare challenge!`
    });
  });

  app.get("/api/truthordare/invite/:code", (req, res) => {
    const { code } = req.params;
    const invite = todInvites[code];
    
    if (!invite) return res.status(404).json({ error: "Invite not found" });
    if (new Date(invite.expiresAt).getTime() < Date.now()) {
      return res.status(410).json({ error: "Invite expired" });
    }

    res.json(invite);
  });

  app.post("/api/truthordare/invite/:code/respond", (req, res) => {
    const { code } = req.params;
    const { response, responderName, challengeType, challengeText } = req.body;
    
    const invite = todInvites[code];
    if (!invite) return res.status(404).json({ error: "Invite not found" });

    if (!todResponses[code]) todResponses[code] = [];
    
    const newResponse = {
      responderName,
      challengeType,
      challengeText,
      response,
      createdAt: new Date().toISOString()
    };

    todResponses[code].push(newResponse);

    // Notify challenger
    if (invite.challengerId) {
      addNotification(invite.challengerId, {
        type: 'TOD_RESPONSE',
        title: '🎲 Truth or Dare Response!',
        body: `${responderName} responded to your challenge: "${response.substring(0, 30)}..."`,
        link: `/truthordare` // Could be a specific results page
      });
    }

    saveData();
    res.json({ success: true });
  });

  app.get("/api/truthordare/invite/:code/responses", (req, res) => {
    const { code } = req.params;
    res.json(todResponses[code] || []);
  });

  // Get User by Identifier
  app.get("/api/users/:identifier", (req, res) => {
    const { identifier } = req.params;
    const viewerId = req.headers['x-user-id'] as string;
    const searchLower = identifier.toLowerCase();

    const userId = usernameToId[searchLower];
    let user = userId ? users[userId] : null;
    
    if (!user) {
      user = Object.values(users).find((u: any) => 
        u.roastboardSlug === searchLower
      );
    }

    if (!user) {
      // Check anonymous inboxes
      if (anonymousInboxes[searchLower]) {
        return res.json({
          username: searchLower,
          isAnonymous: true,
          totalMessages: anonymousInboxes[searchLower].length,
          message: "This user has an anonymous inbox but hasn't created a full profile yet"
        });
      }
      return res.status(404).json({ error: 'User not found' });
    }

    // Track view
    user.viewCount = (user.viewCount || 0) + 1;
    roastboardViews.push({ userId: user.id, viewerId, viewedAt: new Date().toISOString() });

    // Get user's roasts
    const userRoasts = Object.values(roasts)
      .filter((r: any) => r.userId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20);

    res.json({
      ...user,
      rmp: (user.totalShares || 0) * 10 + (user.totalRoasts || 0) * 5 + (user.viewCount || 0),
      roasts: userRoasts
    });
  });

  // Get top roaster
  app.get("/api/top-roaster", (req, res) => {
    const topUser = Object.values(users)
      .sort((a, b) => {
        const scoreA = (a.totalShares || 0) * 10 + (a.totalRoasts || 0) * 5 + (a.viewCount || 0);
        const scoreB = (b.totalShares || 0) * 10 + (b.totalRoasts || 0) * 5 + (b.viewCount || 0);
        return scoreB - scoreA;
      })[0];
    
    if (topUser) {
      const score = (topUser.totalShares || 0) * 10 + (topUser.totalRoasts || 0) * 5 + (topUser.viewCount || 0);
      res.json({ 
        name: topUser.username || topUser.name || 'Anonymous', 
        count: topUser.totalShares,
        score: score
      });
    } else {
      res.json(null);
    }
  });

  // Get leaderboard
  app.get("/api/leaderboard", (req, res) => {
    const leaderboard = Object.values(users)
      .sort((a, b) => (b.totalRMPEarned || 0) - (a.totalRMPEarned || 0))
      .slice(0, 20)
      .map(user => ({
        id: user.id,
        name: user.username ? `@${user.username}` : (user.name || 'Anonymous Roaster'),
        totalShares: user.totalShares || 0,
        totalRoasts: user.totalRoasts || 0,
        viewCount: user.viewCount || 0,
        rmp: user.totalRMPEarned || 0,
        avatar: user.avatar || `https://picsum.photos/seed/${user.id}/100/100`
      }));
    
    res.json(leaderboard);
  });

  // Get roast by ID
  app.get("/api/roasts/:id", (req, res) => {
    const roast = roasts[req.params.id];
    if (roast) {
      res.json(roast);
    } else {
      res.status(404).json({ error: "Roast not found" });
    }
  });

  app.post("/api/roasts/share-to-feed", authenticate, (req: any, res) => {
    const { roastId } = req.body;
    const userId = req.user.uid;
    if (!roastId || !roasts[roastId]) return res.status(404).json({ error: "Roast not found" });
    
    const roast = roasts[roastId];
    if (roast.userId !== userId) return res.status(403).json({ error: "Unauthorized" });

    // Ensure user has a username
    const user = users[userId];
    if (!user || !user.username || user.username === 'anonymous') {
      return res.status(403).json({ 
        error: 'Register your roastboard to post to feed!',
        redirect: '/settings/username'
      });
    }

    roast.isPublic = true;
    roast.feedScore = (roast.feedScore || 0) + 10; // Bonus for sharing to feed
    
    // Award RMP for sharing to feed
    awardRMP(userId, REWARDS.ROAST_SHARE, 'shared_to_feed', `Shared roast ${roastId} to feed`, roastId);
    
    saveData();
    res.json({ success: true });
  });

  // Store roast
  app.post("/api/roasts", authenticate, (req: any, res) => {
    const userId = req.user.uid;
    
    const cooldown = checkRoastCooldown(userId);
    if (!cooldown.allowed) {
      return res.status(429).json({ 
        error: `Please wait ${Math.ceil(cooldown.waitTime! / 1000)} seconds before creating another roast`,
        retryAfter: Math.ceil(cooldown.waitTime! / 1000)
      });
    }

    const { publishToFeed, shareAnonymously, ...roast } = req.body;
    const id = roast.id || Math.random().toString(36).substr(2, 9);
    
    // REQUIRE USERNAME FOR PUBLIC FEED
    if (publishToFeed) {
      const user = users[userId];
      if (!user || !user.username || user.username === 'anonymous') {
        return res.status(403).json({ 
          error: 'Register your roastboard to post to feed!',
          redirect: '/settings/username'
        });
      }
    }
    
    // Add to storage
    roasts[id] = { 
      ...roast, 
      id, 
      targetUsername: roast.targetUsername || roast.username,
      shareCount: 0, 
      referralCount: 0, 
      viewCount: 0,
      remixCount: 0,
      battleWins: 0,
      battleLosses: 0,
      feedScore: 0,
      isPublic: publishToFeed || false,
      shareAnonymously: shareAnonymously || false,
      username: shareAnonymously ? null : (users[userId]?.username || null),
      createdAt: new Date().toISOString()
    };

    // Update user stats
    if (userId) {
      if (!users[userId]) {
        users[userId] = { 
          id: userId, 
          name: `Roaster_${userId.slice(-4)}`, 
          totalShares: 0, 
          totalRoasts: 0, 
          coinBalance: 0, 
          totalCoinsEarned: 0, 
          rmpBalance: 0, 
          totalRMPEarned: 0, 
          viewCount: 0,
          monthlyCoins: 0,
          lastCoinReset: new Date().toISOString()
        };
      }
      users[userId].totalRoasts = (users[userId].totalRoasts || 0) + 1;
      
      // Award RMP for generating a roast
      awardRMP(userId, REWARDS.ROAST_CREATE_EXTRA, 'ROAST_CREATE', `Generated a new roast! 🔥`, id);

      // Update monthly stats
      updateMonthlyStats(userId, { roasts: 1 });

      // Check if this is a response to a challenge
      const { challengeId } = roast;
      if (challengeId && challenges[challengeId]) {
        const challenge = challenges[challengeId];
        if (challenge.status === 'pending' && challenge.challengedId === userId) {
          challenge.status = 'completed';
          challenge.responseRoastId = id;
          challenge.acceptedAt = new Date().toISOString();
          challenge.completedAt = new Date().toISOString();
          
          // Update user stats
          users[userId].challengesAccepted = (users[userId].challengesAccepted || 0) + 1;
          
          // Notify challenger
          const challengerId = challenge.challengerId;
          addNotification(challengerId, {
            userId: challengerId,
            type: 'challenge_accepted',
            title: '⚔️ Challenge Accepted!',
            body: `${users[userId].username || 'Someone'} accepted your roast challenge!`,
            link: `/roast/${id}`
          });
          
          if (!challenge.coinsAwarded) {
            awardRMP(challenge.challengerId, 10, 'CHALLENGE_ACCEPTED', `Challenge accepted by @${users[userId]?.username}`, challengeId);
            awardRMP(userId, 10, 'CHALLENGE_ACCEPTED', `Accepted challenge from @${users[challenge.challengerId]?.username}`, challengeId);
            challenge.coinsAwarded = true;
          }
        }
      }
      
      // Handle direct roast notification
      const { targetUserId } = roast;
      if (targetUserId) {
        addNotification(targetUserId, {
          userId: targetUserId,
          type: 'direct_roast',
          title: 'You got roasted! 🔥',
          body: `${users[userId].username || 'Someone'} just roasted you directly`,
          link: `/roast/${id}`
        });
      }
    }
    
    // Add to cache if text-only
    if (!roast.photoUrl && roast.text && roast.input && roast.input.length > 5) {
      const existing = roastCache.find(c => c.input === roast.input && c.mode === roast.mode);
      if (!existing) {
        roastCache.push({ input: roast.input, output: roast.text, mode: roast.mode });
        if (roastCache.length > 500) roastCache.shift();
      }
    }

    // Trigger cleanup check
    cleanupRoasts();
    saveData();
    
    res.json({ success: true, id });
  });

  app.post("/api/roasts/share", authenticate, async (req: any, res) => {
    const { roastId, platform } = req.body;
    const userId = req.user.uid;
    if (roasts[roastId]) {
      roasts[roastId].shareCount = (roasts[roastId].shareCount || 0) + 1;
      roasts[roastId].feedScore = (roasts[roastId].feedScore || 0) + 5; // Share is worth 5 points
    }
    if (userId) {
      if (!users[userId]) {
        users[userId] = { 
          id: userId, 
          name: `Roaster_${userId.slice(-4)}`, 
          totalShares: 0, 
          totalRoasts: 0, 
          coinBalance: 0, 
          totalCoinsEarned: 0, 
          rmpBalance: 0, 
          totalRMPEarned: 0, 
          viewCount: 0,
          monthlyCoins: 0,
          lastCoinReset: new Date().toISOString()
        };
      }
      users[userId].totalShares = (users[userId].totalShares || 0) + 1;
      
      // Update monthly stats
      updateMonthlyStats(userId, { shares: 1 });

      // Award RMP for sharing or setup
      let actionType = 'ROAST_SHARE';
      let rmpAmount = REWARDS.ROAST_SHARE;
      let description = `Shared roast ${roastId} on ${platform}`;
      
      if (platform === 'roastboard_claim') {
        actionType = 'SETUP';
        rmpAmount = 50; // Special setup bonus
        description = 'Claimed your personalized roastboard! 🔥';
      }

      const result = await addRMP(
        userId,
        rmpAmount,
        actionType as any,
        description,
        roastId
      );
      
      return res.json({ 
        success: true, 
        rmpAwarded: result.awarded ? rmpAmount : 0,
        coinBalance: result.coinBalance
      });
    }
    res.json({ success: true });
  });

  // Track referral/share click
  app.post("/api/referrals/activity-click", async (req, res) => {
    const { referrerId, roastId, linkType = 'REFRERRAL' } = req.body;
    
    if (roastId && roasts[roastId]) {
      roasts[roastId].referralCount = (roasts[roastId].referralCount || 0) + 1;
      roasts[roastId].feedScore = (roasts[roastId].feedScore || 0) + 2; 
    }
    
    if (referrerId && referrerId !== 'direct') {
      try {
        const dailyClicks = await getDailyActivity(referrerId, 'ROAST_SHARE_CLICK');
        if (dailyClicks.count < 50) {
          let reward = REWARDS.ROAST_SHARE_CLICK;
          // Diminishing returns after first few
          if (dailyClicks.count > 5) reward = 0.5;
          if (dailyClicks.count > 15) reward = 0.2;
          
          if (reward > 0) {
            await addRMP(
              referrerId, 
              reward, 
              'ROAST_SHARE_CLICK', 
              `Someone clicked your ${linkType} link`, 
              roastId,
              dailyClicks.count === 0
            );
          }
        }
      } catch (e) {
        console.error('Referral click tracking error:', e);
      }
    }
    
    res.json({ success: true });
  });

  // CHALLENGE SYSTEM ROUTES
  app.post("/api/challenges/create", (req, res) => {
    const { challengerId, challengedUsername, originalRoastId } = req.body;
    if (!challengerId || !challengedUsername || !originalRoastId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const challengedUser = Object.values(users).find(u => u.username?.toLowerCase() === challengedUsername.toLowerCase());
    if (!challengedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (challengedUser.id === challengerId) {
      return res.status(400).json({ error: "Cannot challenge yourself" });
    }

    // Check for existing pending challenge
    const existing = Object.values(challenges).find(c => 
      c.challengerId === challengerId && 
      c.challengedId === challengedUser.id && 
      c.status === 'pending'
    );

    if (existing) {
      return res.status(409).json({ error: "Challenge already pending" });
    }

    const id = Math.random().toString(36).substr(2, 9);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    challenges[id] = {
      id,
      challengerId,
      challengedId: challengedUser.id,
      originalRoastId,
      status: 'pending',
      coinsAwarded: false,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString()
    };

    // Update user stats
    if (users[challengerId]) {
      users[challengerId].challengesSent = (users[challengerId].challengesSent || 0) + 1;
    }

    // Create notification
    addNotification(challengedUser.id, {
      userId: challengedUser.id,
      type: 'challenge_received',
      title: "🔥 You've Been Challenged!",
      body: `${users[challengerId]?.username || 'Someone'} has roasted you. Accept to roast back!`,
      link: `/challenge/${id}`
    });

    res.json({ success: true, challenge: challenges[id] });
  });

  app.get("/api/challenges/:id", (req, res) => {
    const challenge = challenges[req.params.id];
    if (!challenge) return res.status(404).json({ error: "Challenge not found" });

    const challenger = users[challenge.challengerId];
    const challenged = users[challenge.challengedId];
    const originalRoast = roasts[challenge.originalRoastId];
    const responseRoast = challenge.responseRoastId ? roasts[challenge.responseRoastId] : null;

    res.json({
      ...challenge,
      challenger: { id: challenger.id, username: challenger.username, name: challenger.name, avatar: challenger.avatar },
      challenged: { id: challenged.id, username: challenged.username, name: challenged.name, avatar: challenged.avatar },
      originalRoast: { id: originalRoast.id, text: originalRoast.text, photoUrl: originalRoast.photoUrl },
      responseRoast: responseRoast ? { id: responseRoast.id, text: responseRoast.text, photoUrl: responseRoast.photoUrl } : null
    });
  });

  app.post("/api/challenges/view", async (req, res) => {
    const { challengeId, roastId } = req.body;
    const challenge = challenges[challengeId];
    if (!challenge) return res.status(404).json({ error: "Challenge not found" });

    if (!challenge.coinsAwarded && challenge.status === 'completed') {
      // Award RMP to both (STRICT LIMITS)
      try {
        await addRMP(challenge.challengerId, 10, 'CHALLENGE_ACCEPTED', `Challenge accepted by @${users[challenge.challengedId]?.username}`, challengeId);
        await addRMP(challenge.challengedId, 10, 'CHALLENGE_ACCEPTED', `Accepted challenge from @${users[challenge.challengerId]?.username}`, challengeId);
      } catch (e) {
        console.error('Challenge acceptance reward error:', e);
      }
      challenge.coinsAwarded = true;
      return res.json({ success: true, coinsAwarded: true });
    }
    res.json({ success: true, coinsAwarded: false });
  });

  // MONTHLY CHALLENGE ROUTES
  app.get("/api/monthly-challenge", (req, res) => {
    const month = getCurrentMonth();
    let challenge = monthlyChallenges[month];

    if (!challenge) {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      challenge = {
        month,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        isActive: true,
        participants: {}
      };
      monthlyChallenges[month] = challenge;
    }

    const participants = Object.values(challenge.participants)
      .map((p: any) => ({
        ...p,
        user: { 
          username: users[p.userId]?.username, 
          name: users[p.userId]?.name, 
          image: users[p.userId]?.avatar || `https://picsum.photos/seed/${p.userId}/100/100` 
        }
      }))
      .sort((a: any, b: any) => b.totalCoinsEarned - a.totalCoinsEarned)
      .slice(0, 100);

    const now = new Date();
    const endDate = new Date(challenge.endDate);
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    res.json({
      challenge,
      topParticipants: participants,
      daysRemaining
    });
  });

  // ACCOUNT MANAGEMENT ROUTES
  app.delete("/api/user/delete", authenticate, (req: any, res) => {
    const userId = req.user.uid;
    if (!userId || !users[userId]) return res.status(404).json({ error: "User not found" });

    // In a real app, we'd delete from DB. Here we just remove from memory.
    const username = users[userId].username;
    delete users[userId];
    
    // Cleanup other related data if needed
    // (In-memory makes this easy but incomplete)
    
    res.json({ success: true });
  });

  // EVENT API
  app.get("/api/event/current", (req, res) => {
    const eventDate = new Date();
    const eventEnd = new Date(eventDate.getFullYear(), eventDate.getMonth() + 1, 0);
    const daysRemaining = Math.ceil((eventEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    const allUsers = Object.values(users);
    const topParticipants = allUsers
      .filter(u => u.username && u.monthlyCoins > 0)
      .sort((a, b) => (b.monthlyCoins || 0) - (a.monthlyCoins || 0))
      .slice(0, 3);

    const totalParticipants = allUsers.filter(u => u.username).length;

    res.json({
      daysRemaining: 28,
      participants: 3274 + totalParticipants + Object.keys(roasts).length,
      topThree: topParticipants.map((user, index) => ({
        rank: index + 1,
        username: user.username,
        coins: user.monthlyCoins,
        avatar: user.avatar
      })),
      prizePool: 5000 + (totalParticipants * 10)
    });
  });

  // CRON API
  app.post("/api/cron/reset-monthly", (req, res) => {
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const now = new Date();
    if (now.getDate() === 1) {
      Object.values(users).forEach(user => {
        user.monthlyCoins = 0;
        user.lastCoinReset = now.toISOString();
      });
      saveData();
    }
    res.json({ success: true });
  });

  // STATS API
  app.post("/api/activity/click", (req, res) => {
    const { linkType, linkId, referrerId } = req.body;
    
    try {
      // Award 1 coin to referrer for click
      if (referrerId && users[referrerId]) {
        users[referrerId].coinBalance = (users[referrerId].coinBalance || 0) + 1;
        users[referrerId].totalReferrals = (users[referrerId].totalReferrals || 0) + 1;
      }
      
      saveData();
      res.json({ success: true });
    } catch (error) {
      console.error('Track click error:', error);
      res.status(500).json({ success: false });
    }
  });

  app.get("/api/platform-data", (req, res) => {
    const allUsers = Object.values(users);
    const sortedByRMP = [...allUsers].sort((a: any, b: any) => (b.totalRMPEarned || 0) - (a.totalRMPEarned || 0));
    const currentLeader = sortedByRMP[0];
    
    const totalRoasts = Object.keys(roasts).length;
    const totalParticipants = allUsers.length;
    
    // Baselines as requested
    const roastersBaseline = 3214;
    const participantsBaseline = 1268;

    res.json({
      rmpToday: 124000 + (totalRoasts * 10),
      trendingRank: 1,
      avgGeneration: 0.4,
      roasters: roastersBaseline + allUsers.filter((u: any) => u.username).length,
      participants: participantsBaseline + Object.values(friendshipChallenges).filter((c: any) => c.status === 'completed').length,
      daysRemaining: 6,
      prizePool: 5000 + (totalParticipants * 10),
      topLeader: currentLeader ? {
        username: currentLeader.username,
        rmp: currentLeader.totalRMPEarned
      } : null
    });
  });

  // GAMES API
  app.post("/api/games/complete", authenticate, async (req: any, res) => {
    const { game, score } = req.body;
    const userId = req.user.uid;

    if (!userId || !game) return res.status(400).json({ error: "Missing fields" });

    // Initialize stats if needed
    if (!gameStats[game]) {
      gameStats[game] = {
        totalPlays: 0,
        totalScore: 0,
        totalCoinsEarned: 0,
        highScores: {}
      };
    }

    const stats = gameStats[game];
    stats.totalPlays += 1;
    stats.totalScore += (score || 0);

    // Track user high score
    const userHighScore = stats.highScores[userId] || 0;
    if ((score || 0) > userHighScore) {
      stats.highScores[userId] = score;
    }

    // Award RMP with hardened logic
    try {
      const rewardAmount = (score || 0) > 1000 ? REWARDS.GAME_COMPLETE_FIRST * 1.5 : REWARDS.GAME_COMPLETE_FIRST;
      const result = await economyService.addRMP(
        userId, 
        rewardAmount, 
        'GAME_COMPLETE', 
        `Completed ${game} with score ${score}`,
        game
      );
      
      // Update local XP for leaderboard tracking
      if (users[userId]) {
        users[userId].arcadeXP = (users[userId].arcadeXP || 0) + (score || 0);
      }

      await updateQuestProgress(userId, 'game');

      res.json({
        success: true,
        awarded: result.awarded,
        amount: result.amount,
        newRMP: result.newRMP,
        newCoins: result.newCoins,
        stats: {
          totalPlays: stats.totalPlays,
          userHighScore: stats.highScores[userId]
        }
      });
    } catch (err: any) {
      console.error('Game completion error:', err);
      res.status(500).json({ error: 'Failed to process game completion' });
    }
  });

  app.get("/api/games/leaderboard", async (req, res) => {
    try {
      const topUsers = Object.values(users)
        .filter((u: any) => u.username)
        .sort((a: any, b: any) => (b.arcadeXP || 0) - (a.arcadeXP || 0))
        .slice(0, 10)
        .map((u: any) => ({
          name: u.username,
          score: u.arcadeXP || 0,
          rank: u.arcadeXP ? (RANKS.find((r: any) => u.arcadeXP >= r.min && u.arcadeXP <= r.max)?.name || "Rookie") : "Rookie"
        }));
      
      res.json(topUsers);
    } catch (err) {
      res.json(MOCK_LB); // Fallback to mock data if it fails
    }
  });

  app.get("/api/games/stats", authenticateMiddleware, async (req: any, res) => {
    try {
      const stats = await economyService.getUserEconomyStats(req.user.uid);
      res.json(stats);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });


  // FEED API
  app.get("/api/roasts/feed", (req, res) => {
    const { page = '0', limit = '10', filter = 'trending' } = req.query;
    const p = parseInt(page as string);
    const l = parseInt(limit as string);
    
    let allRoasts = Object.values(roasts).filter(r => r.isPublic !== false);
    
    // Sorting logic
    if (filter === 'trending') {
      allRoasts.sort((a, b) => (b.feedScore || 0) - (a.feedScore || 0));
    } else if (filter === 'new') {
      allRoasts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (filter === 'savage') {
      allRoasts.sort((a, b) => (b.battleWins || 0) - (a.battleWins || 0));
    }
    
    const paginated = allRoasts.slice(p * l, (p + 1) * l).map(r => {
      const user = users[r.userId];
      const roastReactions = reactions[r.id] || [];
      
      // Calculate reaction counts
      const counts: Record<string, number> = {};
      roastReactions.forEach(react => {
        counts[react.type] = (counts[react.type] || 0) + 1;
      });

      return {
        ...r,
        username: user?.username || 'anonymous',
        reactions: counts,
        isTrending: (r.feedScore || 0) > 50
      };
    });
    
    res.json(paginated);
  });

  app.post("/api/roasts/react", (req, res) => {
    const { roastId, type, userId } = req.body;
    if (!roastId || !type) return res.status(400).json({ error: "Missing fields" });
    
    if (!reactions[roastId]) reactions[roastId] = [];
    
    // Simple reaction logic (one per user/session)
    const sessionId = req.headers['x-session-id'] as string || userId || 'anon';
    const existingIdx = reactions[roastId].findIndex(r => r.userId === sessionId);
    
    if (existingIdx >= 0) {
      reactions[roastId][existingIdx].type = type;
    } else {
      reactions[roastId].push({ userId: sessionId, type, createdAt: new Date().toISOString() });
      
      // Award RMP for receiving a reaction
      const roast = roasts[roastId];
      if (roast && roast.userId) {
        awardRMP(roast.userId, REWARDS.REACTION_RECEIVED, 'REACTION_RECEIVED', `Received a ${type} reaction!`, roastId);
      }
    }
    
    // Update feed score
    if (roasts[roastId]) {
      roasts[roastId].feedScore = (roasts[roastId].feedScore || 0) + 1;
    }
    
    saveData();
    res.json({ success: true });
  });

  // BATTLE API
  app.get("/api/battle/roasts", (req, res) => {
    const allRoasts = Object.values(roasts).filter(r => r.isPublic !== false);
    if (allRoasts.length < 2) return res.status(400).json({ error: "Not enough roasts for battle" });
    
    // Pick two random roasts
    const shuffled = [...allRoasts].sort(() => 0.5 - Math.random());
    const pair = shuffled.slice(0, 2).map(r => {
      const user = users[r.userId];
      return {
        ...r,
        user: user ? { username: user.username, avatar: user.avatar } : null
      };
    });
    
    res.json({ roasts: pair });
  });

  app.post("/api/battle/vote", async (req, res) => {
    const { winnerId, loserId, userId } = req.body;
    if (!winnerId || !loserId) return res.status(400).json({ error: "Missing fields" });
    
    // Deduct RMP cost for battle entry if userId provided
    if (userId && users[userId]) {
      const user = users[userId];
      if ((user.rmpBalance || 0) < 100) {
        return res.status(400).json({ error: "Insufficient RMP to battle" });
      }
      
      try {
        await addRMP(userId, -100, 'BATTLE_ENTRY', 'Entered battle arena');
        user.rmpBalance = (user.rmpBalance || 0) - 100;
      } catch (e) {
        console.error('Battle entry error:', e);
      }
    }

    if (roasts[winnerId]) {
      roasts[winnerId].battleWins = (roasts[winnerId].battleWins || 0) + 1;
      roasts[winnerId].feedScore = (roasts[winnerId].feedScore || 0) + 5;
      
      // Award RMP to the winner's creator if they exist (STRICT LIMITS)
      const winnerCreatorId = roasts[winnerId].userId;
      if (winnerCreatorId) {
        await addRMP(winnerCreatorId, REWARDS.BATTLE_WIN, 'BATTLE_WIN', `Won a roast battle! ⚔️`, winnerId);
      }
    }
    
    if (roasts[loserId]) {
      roasts[loserId].battleLosses = (roasts[loserId].battleLosses || 0) + 1;
    }
    
    battleVotes.push({
      winnerId,
      loserId,
      userId: userId || 'anon',
      createdAt: new Date().toISOString()
    });
    
    saveData();
    res.json({ success: true });
  });

  // ==========================================
  // VIRAL ECOSYSTEM OVERHAUL APIS
  // ==========================================

  app.post("/api/battle/challenge", authenticate, async (req: any, res) => {
    const userId = (req as any).user.uid;
    const user = users[userId];
    const { opponentUsername, challengerRoastId } = req.body;

    const formattedOpponentUsername = opponentUsername.toLowerCase();
    const opponentId = usernameToId[formattedOpponentUsername];
    
    if (!opponentId) return res.status(404).json({ error: 'User not found' });
    const opponent = users[opponentId];
    if (opponentId === userId) return res.status(400).json({ error: 'Cannot battle yourself' });

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);
    const votingEndsAt = new Date();
    votingEndsAt.setHours(votingEndsAt.getHours() + 72);
    const battleId = Math.random().toString(36).substr(2, 9);
    
    duoBattles[battleId] = {
      id: battleId, challengerId: userId, challengerName: user.username,
      challengerRoastId, opponentId: opponent.id, opponentName: opponent.username,
      status: 'pending', expiresAt: expiresAt.toISOString(),
      votingEndsAt: votingEndsAt.toISOString(), createdAt: new Date().toISOString(),
      challengerScore: 0, opponentScore: 0
    };
    duoBattleVotes[battleId] = [];

    addNotification(opponent.id, {
      type: 'BATTLE_CHALLENGE', title: '⚔️ You\'ve Been Challenged!',
      body: `${user.username} challenged you to a roast battle!`, link: `/battle/${battleId}`
    });

    await awardRMP(userId, 10, 'BATTLE_CHALLENGE', `Challenged ${opponent.username}`);
    await updateQuestProgress(userId, 'battle');
    saveData();
    res.status(200).json({ success: true, battleId, shareLink: `https://roastme.site/battle/${battleId}` });
  });

  app.post("/api/battle/accept", authenticate, async (req: any, res) => {
    const userId = (req as any).user.uid;
    const { battleId, opponentRoastId } = req.body;
    const battle = duoBattles[battleId];
    if (!battle) return res.status(404).json({ error: 'Battle not found' });
    if (battle.opponentId !== userId) return res.status(403).json({ error: 'Not authorized' });
    if (battle.status !== 'pending') return res.status(400).json({ error: 'Battle already accepted or expired' });
    
    if (new Date() > new Date(battle.expiresAt)) {
      battle.status = 'expired'; saveData();
      return res.status(410).json({ error: 'Battle has expired' });
    }

    battle.status = 'voting'; battle.opponentRoastId = opponentRoastId; battle.completedAt = new Date().toISOString();
    await awardRMP(userId, 10, 'BATTLE_ACCEPT', `Accepted battle against ${battle.challengerName}`);
    saveData();
    res.status(200).json({ success: true, battleId, message: 'Voting open.' });
  });

  app.post("/api/battle/duo-vote", async (req, res) => {
    const { battleId, votedFor } = req.body;
    let vsession = req.headers['x-session-id'] as string;
    if (!vsession) vsession = Math.random().toString(36).substr(2, 9);
    if (!duoBattles[battleId]) return res.status(404).json({ error: "Battle not found" });

    const existingVote = duoBattleVotes[battleId]?.find((v: any) => v.voterSession === vsession);
    if (existingVote) return res.status(400).json({ error: 'Already voted' });

    duoBattleVotes[battleId].push({ voterSession: vsession, votedFor, createdAt: new Date().toISOString() });
    const b = duoBattles[battleId];
    b.challengerScore = duoBattleVotes[battleId].filter((v: any) => v.votedFor === 'challenger').length;
    b.opponentScore = duoBattleVotes[battleId].filter((v: any) => v.votedFor === 'opponent').length;

    saveData();
    res.json({ success: true, challengerScore: b.challengerScore, opponentScore: b.opponentScore });
  });

  app.get("/api/battle/:id", (req, res) => {
    const { id } = req.params;
    const battle = duoBattles[id];
    if (!battle) return res.status(404).json({ error: "Battle not found" });

    const battleWithRoasts = {
      ...battle,
      challengerRoast: roasts[battle.challengerRoastId] || null,
      opponentRoast: battle.opponentRoastId ? roasts[battle.opponentRoastId] : null,
      totalVotes: (battle.challengerScore || 0) + (battle.opponentScore || 0),
      challengerVotes: battle.challengerScore || 0,
      opponentVotes: battle.opponentScore || 0
    };

    res.json(battleWithRoasts);
  });

  app.get("/api/battle/:id/has-voted", async (req: any, res) => {
    const { id } = req.params;
    let vsession = req.headers['x-session-id'] as string;
    if (!vsession) {
      return res.json({ hasVoted: false });
    }
    const existingVote = duoBattleVotes[id]?.find((v: any) => v.voterSession === vsession);
    res.json({ hasVoted: !!existingVote });
  });

  app.get("/api/streak/status", authenticate, async (req: any, res) => {
    const userId = (req as any).user.uid;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let streak = userStreaks[userId];
    
    if (!streak) {
      // Initialize from main user profile if possible
      const user = users[userId];
      const initialStreak = user?.streakCount || 1;
      streak = { 
        userId, 
        currentStreak: initialStreak, 
        longestStreak: initialStreak, 
        lastActiveDate: today.toISOString(), 
        streakFrozen: false, 
        streakFreezeAvailable: 1 
      };
      userStreaks[userId] = streak;
      if (initialStreak === 1) {
        await awardRMP(userId, 5, 'STREAK_BONUS', 'Started a new streak');
      }
      saveData();
      return res.json({ current: streak.currentStreak, longest: streak.longestStreak });
    }
    const last = new Date(streak.lastActiveDate); last.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - last.getTime()) / 86400000);
    if (diff === 1) {
      streak.currentStreak += 1;
      await awardRMP(userId, 5 + Math.min(streak.currentStreak * 5, 100), 'STREAK_BONUS', 'Streak bonus!');
      streak.lastActiveDate = today.toISOString();
    } else if (diff > 1) {
      streak.currentStreak = 1; streak.lastActiveDate = today.toISOString();
    }
    streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
    saveData();
    res.json({ current: streak.currentStreak, longest: streak.longestStreak });
  });

  app.get("/api/quests/daily", authenticate, (req: any, res) => {
    const id = (req as any).user.uid;
    const d = new Date().toISOString().split('T')[0];
    if (!dailyQuestsData[id] || dailyQuestsData[id].date !== d) {
      const questsObj: Record<string, boolean> = {};
      for (const q of QUEST_TYPES) {
        questsObj[q.id] = false;
      }
      dailyQuestsData[id] = {
        date: d, quests: questsObj,
        allCompleted: false, claimed: false
      };
      saveData();
    }
    
    // Format response
    const questsWithDetails = QUEST_TYPES.map(q => ({
      ...q,
      completed: dailyQuestsData[id].quests[q.id] || false
    }));
    
    res.json({ quests: questsWithDetails, allCompleted: dailyQuestsData[id].allCompleted, claimedReward: dailyQuestsData[id].claimed });
  });

  app.post("/api/quests/claim", authenticate, async (req: any, res) => {
    const id = (req as any).user.uid;
    if (dailyQuestsData[id]?.allCompleted && !dailyQuestsData[id].claimed) {
      dailyQuestsData[id].claimed = true;
      await awardRMP(id, 100, 'DAILY_QUESTS', 'Completed quests');
      await awardCoins(id, 'QUEST_COMPLETE', 'Daily bonus coins');
      saveData();
      return res.json({ success: true, reward: 100 });
    }
    res.status(400).json({ error: 'Quests not completed or already claimed' });
  });

  app.get("/api/leaderboard/weekly", (req, res) => {
    const sorted = Object.values(users).filter((u: any) => u.rmpBalance > 0)
      .sort((a: any, b: any) => (b.rmpBalance || 0) - (a.rmpBalance || 0))
      .slice(0, 100).map((u: any, i) => ({ rank: i + 1, user: { username: u.username, image: u.avatarUrl }, totalRMP: u.rmpBalance }));
    res.json({ leaderboard: sorted });
  });

  // REMIX API
  app.post("/api/remix/generate", (req, res) => {
    const { originalId, text, photoUrl, userId } = req.body;
    if (!originalId || !text) return res.status(400).json({ error: "Missing fields" });
    
    const id = Math.random().toString(36).substr(2, 9);
    const originalRoast = roasts[originalId];
    
    roasts[id] = {
      id,
      text,
      photoUrl: photoUrl || originalRoast?.photoUrl,
      userId,
      originalId,
      isPublic: true,
      remixCount: 0,
      battleWins: 0,
      battleLosses: 0,
      feedScore: 0,
      createdAt: new Date().toISOString()
    };
    
    if (originalRoast) {
      originalRoast.remixCount = (originalRoast.remixCount || 0) + 1;
      originalRoast.feedScore = (originalRoast.feedScore || 0) + 10;
    }
    
    if (userId) {
      awardRMP(userId, REWARDS.REMIX, 'REMIX', `Remixed a roast! 🎨`, id);
    }
    
    res.json({ success: true, id });
  });

  app.get("/api/roasts/:id/remix-count", (req, res) => {
    const roast = roasts[req.params.id];
    res.json({ count: roast?.remixCount || 0 });
  });

  // ANONYMOUS MESSAGING SYSTEM
  app.post("/api/anonymous/generate", (req, res) => {
    const { username } = req.body;
    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ error: 'Only letters, numbers, and underscores allowed' });
    }

    const formattedUsername = username.toLowerCase();
    
    // Check if we already have a link for this username
    let link = Object.values(anonymousLinks).find((l: any) => l.username === formattedUsername);
    
    if (!link) {
      const linkCode = Math.random().toString(36).substr(2, 10);
      link = {
        linkCode,
        username: formattedUsername,
        createdAt: new Date().toISOString()
      };
      anonymousLinks[linkCode] = link;
      saveData();
    }

    res.json({
      success: true,
      linkCode: (link as any).linkCode,
      link: `https://roastme.site/anonymous/send/${(link as any).linkCode}`,
      username: (link as any).username
    });
  });

  app.get("/api/anonymous/recipient/:code", (req, res) => {
    const { code } = req.params;
    const link = anonymousLinks[code];
    if (!link) return res.status(404).json({ error: "Invalid or expired link" });
    res.json({ username: link.username });
  });

  app.post("/api/anonymous/send", async (req, res) => {
    const { linkCode, message, recipientUsername } = req.body;
    
    let targetUsername = recipientUsername;
    if (linkCode) {
      const link = anonymousLinks[linkCode];
      if (link) targetUsername = link.username;
    }

    if (!targetUsername) return res.status(400).json({ error: "Missing link code or recipient" });
    if (!message || message.trim().length === 0) return res.status(400).json({ error: "Message cannot be empty" });
    if (message.length > 500) return res.status(400).json({ error: "Message too long (max 500 characters)" });

    const formattedUsername = targetUsername.toLowerCase();
    if (!anonymousInboxes[formattedUsername]) anonymousInboxes[formattedUsername] = [];

    const newMessage = {
      id: Math.random().toString(36).substr(2, 9),
      message: message.trim(),
      isRead: false,
      createdAt: new Date().toISOString()
    };

    anonymousInboxes[formattedUsername].push(newMessage);
    
    // Also update user stats if they are a registered user
    const recipientUser = Object.values(users).find((u: any) => u.username === formattedUsername.replace('@', ''));
    if (recipientUser) {
      const rId = (recipientUser as any).id;
      if (!anonymousMessages[rId]) anonymousMessages[rId] = [];
      anonymousMessages[rId].push(newMessage);
      
      // Award RMP for receiving message (STRICT LIMITS)
      try {
        const dailyAnonCount = (await getDailyActivity(rId, 'ANON_MESSAGE_RECEIVED')).count;
        if (dailyAnonCount < REWARDS.ANON_DAILY_LIMIT) {
          const isFirstOfDay = dailyAnonCount === 0;
          const reward = isFirstOfDay ? REWARDS.ANON_MESSAGE_RECEIVED_FIRST : REWARDS.ANON_MESSAGE_RECEIVED_EXTRA;
          await addRMP(rId, reward, 'ANON_MESSAGE_RECEIVED', 'Received an anonymous message! 💌', undefined, isFirstOfDay);
        }
      } catch (e) {
        console.error('Anon reward error:', e);
      }
    }

    saveData();
    res.json({ success: true, deliveredTo: formattedUsername });
  });

  app.get("/api/anonymous/messages/:username", (req, res) => {
    const { username } = req.params;
    if (!username) return res.status(400).json({ error: 'Username required' });
    
    const formattedUsername = username.toLowerCase();
    const messages = anonymousInboxes[formattedUsername] || [];
    
    // Mark as read
    messages.forEach((m: any) => m.isRead = true);
    
    res.json({ messages });
  });

  // Legacy/Compatibility endpoints
  app.get("/api/anonymous/resolve/:code", (req, res) => {
    const { code } = req.params;
    const link = anonymousLinks[code];
    if (!link) return res.status(404).json({ error: "Link not found" });
    res.json({ username: link.username });
  });

  // TRUTH OR DARE SOCIAL API
  app.get("/api/truthordare/streak", (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.json({ current: 0, longest: 0, weeklyScore: 0 });
    
    if (!todStreaks[userId]) {
      todStreaks[userId] = {
        userId,
        current: 0,
        longest: 0,
        weeklyScore: 0,
        lastPlayedAt: null
      };
    }
    res.json(todStreaks[userId]);
  });

  app.get("/api/truthordare/leaderboard", (req, res) => {
    const leaderboard = Object.values(todStreaks)
      .sort((a: any, b: any) => b.weeklyScore - a.weeklyScore)
      .slice(0, 10)
      .map((s: any) => ({
        username: users[s.userId]?.username || "Ghost",
        weeklyScore: s.weeklyScore
      }));
    res.json(leaderboard);
  });

  app.post("/api/truthordare/play", (req, res) => {
    const { userId, type } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    if (!todStreaks[userId]) {
      todStreaks[userId] = { userId, current: 0, longest: 0, weeklyScore: 0, lastPlayedAt: null };
    }

    const streak = todStreaks[userId];
    const now = new Date();
    const lastPlayed = streak.lastPlayedAt ? new Date(streak.lastPlayedAt) : null;

    // Update weekly score
    streak.weeklyScore += 10;

    // Update streak
    if (!lastPlayed) {
      streak.current = 1;
    } else {
      const diffDays = Math.floor((now.getTime() - lastPlayed.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        streak.current += 1;
      } else if (diffDays > 1) {
        streak.current = 1;
      }
    }

    if (streak.current > streak.longest) streak.longest = streak.current;
    streak.lastPlayedAt = now.toISOString();

    saveData();
    res.json(streak);
  });

  app.post("/api/truthordare/challenge", (req, res) => {
    const { challengerId, targetUsername, question, mode } = req.body;
    
    const searchLower = targetUsername.replace('@', '').toLowerCase();
    const targetId = usernameToId[searchLower];
    const target = targetId ? users[targetId] : null;
    
    if (!target) return res.status(404).json({ error: "User not found" });

    const challengeId = Math.random().toString(36).substr(2, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);

    todChallenges[challengeId] = {
      id: challengeId,
      challengerId,
      challengerName: users[challengerId]?.username,
      targetId: (target as any).id,
      targetUsername: (target as any).username,
      mode,
      question,
      status: "pending",
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    // Add notification
    addNotification(targetId, {
      type: "TRUTH_OR_DARE",
      title: "🎲 Challenge Received!",
      body: `${users[challengerId]?.username} challenged you to a ${mode}!`,
      link: `/truthordare/${challengeId}`
    });

    saveData();
    res.json({ challengeId });
  });

  app.get("/api/truthordare/challenge/:id", (req, res) => {
    const challenge = todChallenges[req.params.id];
    if (!challenge) return res.status(404).json({ error: "Challenge not found" });
    res.json(challenge);
  });

  app.post("/api/truthordare/complete/:id", (req, res) => {
    const { id } = req.params;
    const { response, userId, username } = req.body;
    
    const challenge = todChallenges[id];
    if (!challenge) return res.status(404).json({ error: "Challenge not found" });
    
    if (challenge.status !== 'pending') {
      return res.status(400).json({ error: "Challenge already completed" });
    }
    
    challenge.status = 'completed';
    challenge.response = response;
    challenge.completedAt = new Date().toISOString();
    challenge.completedBy = userId;
    challenge.completedByUsername = username;
    
    // Award points to challenger
    if (challenge.challengerId) {
      awardRMP(challenge.challengerId, REWARDS.CHALLENGE_COMPLETE_EXTRA, 'CHALLENGE_COMPLETED', `Someone completed your challenge! 🎲`, challenge.id);
    }

    if (userId) {
      updateQuestProgress(userId, 'tod');
      awardRMP(userId, REWARDS.TOD_CHALLENGE_COMPLETE_FIRST, 'TOD_CHALLENGE_COMPLETED', `Completed ${challenge.challengerName || 'someone'}'s challenge!`, challenge.id);
    }
    
    // Notify challenger
    const challengerId = challenge.challengerId;
    if (challengerId) {
      addNotification(challengerId, {
        type: 'CHALLENGE_COMPLETED',
        title: '🎲 Challenge Completed!',
        body: `${username || 'Someone'} completed your ${challenge.mode} challenge!`,
        link: `/truthordare/result/${challenge.id}`
      });
    }
    
    saveData();
    res.json({ success: true });
  });

  app.get("/api/friendship/question-pool", (req, res) => {
    res.json({ questions: friendshipQuestionPool });
  });

  app.post("/api/friendship/create", async (req, res) => {
    const { userId, username, challengeType, questions, rivalryMode } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Please create a roastboard first before creating challenges' });
    }

    if (!questions || questions.length !== 10) {
      return res.status(400).json({ error: 'Challenge must have exactly 10 questions' });
    }

    for (const q of questions) {
      if (!q.options || q.options.length !== 4) {
        return res.status(400).json({ error: 'Each question must have exactly 4 choices' });
      }
    }

    const challengeId = Math.random().toString(36).substr(2, 12);
    const shareCode = Math.random().toString(36).substr(2, 8).toUpperCase();
    
    // Award 1 coin for creating challenge
    if (userId && users[userId]) {
      users[userId].coinBalance = (users[userId].coinBalance || 0) + 1;
      await updateQuestProgress(userId, 'friendship');
    }

    friendshipChallenges[challengeId] = {
      id: challengeId,
      shareCode,
      creatorId: userId,
      creatorUsername: username,
      challengeType: challengeType || "custom",
      questions: questions, // Array of {question, options, creatorAnswer}
      responses: [],
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      totalQuestions: questions.length,
      rivalryMode: !!rivalryMode,
      rounds: [],
      averageScore: 0,
      totalPlays: 0
    };
    
    saveData();
    res.json({ 
      success: true,
      challengeId, 
      shareCode,
      shareLink: `https://${req.get('host')}/friendship/${challengeId}`,
      rivalryMode: !!rivalryMode
    });
  });

  app.get("/api/friendship/challenge/:code", (req, res) => {
    const { code } = req.params;
    const challenge = Object.values(friendshipChallenges).find((c: any) => c.shareCode === code || c.id === code);
    
    if (!challenge) return res.status(404).json({ error: "Challenge not found" });
    if (new Date(challenge.expiresAt) < new Date()) return res.status(410).json({ error: "Challenge expired" });
    
    res.json({
      id: challenge.id,
      creatorUsername: challenge.creatorUsername,
      rivalryMode: challenge.rivalryMode,
      questions: challenge.questions.map((q: any) => ({
        question: q.question,
        options: q.options
      })),
      expiresAt: challenge.expiresAt
    });
  });

  app.post("/api/friendship/challenge/:code/submit", (req, res) => {
    const { code } = req.params;
    const { answers, responderName, responderId } = req.body;
    
    const challenge = Object.values(friendshipChallenges).find((c: any) => c.shareCode === code) as any;
    if (!challenge) return res.status(404).json({ error: "Challenge not found" });
    
    let matches = 0;
    const comparisons = challenge.questions.map((q: any, idx: number) => {
      const match = q.creatorAnswer === answers[idx];
      if (match) matches++;
      return {
        question: q.question,
        creatorAnswer: q.creatorAnswer,
        friendAnswer: answers[idx],
        match
      };
    });
    
    const percentage = Math.round((matches / challenge.questions.length) * 100);
    
    const response = {
      responderId: responderId || 'anonymous',
      responderName: responderName || 'Someone',
      answers,
      matchCount: matches,
      percentage,
      completedAt: new Date().toISOString()
    };

    if (!challenge.responses) challenge.responses = [];
    challenge.responses.push(response);
    challenge.status = 'completed'; // Mark as completed (or keep pending if multiple allowed)
    
    // Notify creator
    if (challenge.creatorId) {
      addNotification(challenge.creatorId, {
        type: 'friendship_result',
        title: '🤝 Someone Completed Your Challenge!',
        message: `${responderName} scored ${percentage}% (${matches}/${challenge.questions.length} correct)`,
        link: `/friendship/results/${challenge.id}`
      });
      awardRMP(challenge.creatorId, 5, 'FRIENDSHIP_CHALLENGE_COMPLETED', `${responderName} completed your challenge!`);
    }

    if (responderId && responderId !== 'anonymous' && users[responderId]) {
       awardRMP(responderId, 5, 'FRIENDSHIP_CHALLENGE_COMPLETED', `Completed ${challenge.creatorUsername}'s friendship challenge!`);
    }

    saveData();
    res.json({
      success: true,
      percentage,
      matchCount: matches,
      totalQuestions: challenge.questions.length,
      comparisons,
      creatorUsername: challenge.creatorUsername
    });
  });

  app.post("/api/truthordare/lobby/join", (req, res) => {
    const { userId } = req.body;
    // Simple lobby logic: find waiting or create new
    let lobby = Object.values(todLobbies).find((l: any) => l.status === "waiting" && !l.players.includes(userId));
    
    if (!lobby) {
      const code = Math.random().toString(36).substr(2, 6).toUpperCase();
      lobby = {
        id: code,
        players: [userId],
        currentTurn: 0,
        status: "waiting",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      };
      todLobbies[code] = lobby;
    } else {
      (lobby as any).players.push(userId);
      if ((lobby as any).players.length >= 2) {
        (lobby as any).status = "active";
      }
    }

    saveData();
    res.json({ code: (lobby as any).id });
  });

  app.get("/api/truthordare/lobby/:code", (req, res) => {
    const lobby = todLobbies[req.params.code];
    if (!lobby) return res.status(404).json({ error: "Lobby not found" });
    res.json(lobby);
  });

  // PRANK LINK API
  app.post("/api/prank/upload-photo", async (req, res) => {
    const { photo } = req.body;
    if (!photo) return res.status(400).json({ error: "No photo provided" });

    // Validate photo format (base64)
    const matches = photo.match(/^data:image\/([A-Za-z-+\d.]+);base64,(.+)$/);
    if (!matches) return res.status(400).json({ error: "Invalid image format" });

    const mimeType = matches[1].toLowerCase();
    const allowed = ["jpeg", "png", "webp", "jpg"];
    if (!allowed.includes(mimeType)) {
      return res.status(400).json({ error: "Invalid file type. Allowed: JPEG, PNG, WEBP" });
    }

    const base64Data = matches[2];
    const sizeInBytes = Buffer.byteLength(base64Data, "base64");
    if (sizeInBytes > 2 * 1024 * 1024) {
      return res.status(400).json({ error: "Image too large. Max 2MB" });
    }

    try {
      const tempDir = path.join(process.cwd(), "public", "temp");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const fileName = `${randomBytes(16).toString("hex")}.${mimeType === 'jpeg' ? 'jpg' : mimeType}`;
      const filePath = path.join(tempDir, fileName);
      
      fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
      
      const publicUrl = `/temp/${fileName}`;
      
      res.json({
        success: true,
        photoUrl: publicUrl,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
    } catch (error) {
      console.error("Photo upload error:", error);
      res.status(500).json({ error: "Failed to upload photo" });
    }
  });

  app.post("/api/prank/create", async (req, res) => {
    const { creatorId, creatorName, prankType, title, message, revealMessage, photoUrl } = req.body;
    const id = Math.random().toString(36).substr(2, 8);
    
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    const photoExpiresAt = photoUrl ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null;

    prankLinks[id] = {
      id,
      creatorId,
      creatorName: creatorName || users[creatorId]?.username || 'someone',
      prankType,
      title,
      message,
      revealMessage,
      photoUrl: photoUrl || null,
      photoExpiresAt,
      clickCount: 0,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    // Award RMP for creating prank (STRICT LIMITS)
    try {
      const dailyPrankCount = (await getDailyActivity(creatorId, 'PRANK_CREATE')).count;
      if (dailyPrankCount < REWARDS.PRANK_DAILY_LIMIT) {
        await addRMP(creatorId, REWARDS.PRANK_CREATE, 'PRANK_CREATE', `Created a ${prankType} prank! 🃏`, id, dailyPrankCount === 0);
      }
      
      if (creatorId) {
        await updateQuestProgress(creatorId, 'prank');
      }
    } catch (e) {
      console.error('Prank reward error:', e);
    }

    saveData();
    res.json({ id });
  });

  app.get("/api/prank/:id", (req, res) => {
    const prank = prankLinks[req.params.id];
    if (!prank) return res.status(404).json({ error: "Prank not found" });
    
    // Check if photo is expired
    if (prank.photoUrl && prank.photoExpiresAt) {
      if (new Date() > new Date(prank.photoExpiresAt)) {
        prank.photoUrl = null;
        prank.photoExpiresAt = null;
        saveData();
      }
    }

    prank.clickCount += 1;
    
    // Award RMP to the creator for the click (STRICT LIMITS)
    if (prank.creatorId) {
      getDailyActivity(prank.creatorId, 'PRANK_CLICK').then(dailyClicks => {
        if (dailyClicks.count < 50) {
          addRMP(prank.creatorId, REWARDS.PRANK_SHARE_CLICK, 'PRANK_CLICK', 'Someone fell for your prank! 🃏', prank.id, dailyClicks.count === 0);
        }
      }).catch(e => console.error('Prank click reward error:', e));
    }

    saveData();
    res.json(prank);
  });

  app.post("/api/prank/:id/complete", async (req, res) => {
    const { id } = req.params;
    const { victimId, victimIp } = req.body;
    
    prankDeliveries.push({
      id: Math.random().toString(36).substr(2, 9),
      prankLinkId: id,
      victimId,
      victimIp,
      completed: true,
      completedAt: new Date().toISOString()
    });

    const prank = prankLinks[id];
    if (prank && prank.creatorId) {
      try {
        // Notify the creator
        addNotification(prank.creatorId, {
          title: "Prank Completed! 😈",
          message: `Someone just fell for your "${prank.prankType}" prank!`,
          type: "prank_completed",
          link: `/prank`
        });
      } catch (e) {
        console.error('Prank completion notification error:', e);
      }
    }

    saveData();
    res.json({ success: true });
  });

  // FRIENDSHIP CHALLENGE ENHANCEMENTS
  app.get("/api/friendship/sets", (req, res) => {
    res.json(Object.values(friendshipQuestionSets).filter((s: any) => s.isActive));
  });

  app.get("/api/friendship/results/:id", (req, res) => {
    const { id } = req.params;
    const challenge = friendshipChallenges[id] || Object.values(friendshipChallenges).find((c: any) => c.shareCode === id);
    
    if (!challenge) return res.status(404).json({ error: "Results not found" });
    
    // For backwards compatibility, return latest response if no responses array
    const latestResponse = challenge.responses && challenge.responses.length > 0 
      ? challenge.responses[challenge.responses.length - 1] 
      : {
          responderName: challenge.friendName || 'Someone',
          percentage: challenge.matchScore || 0,
          matchCount: challenge.matchCount || 0,
          answers: challenge.friendAnswers ? JSON.parse(challenge.friendAnswers) : []
        };

    const comparisons = challenge.questions.map((q: any, idx: number) => {
      const creatorAnswer = q.creatorAnswer;
      const friendAnswer = latestResponse.answers ? latestResponse.answers[idx] : null;
      const match = creatorAnswer === friendAnswer;
      
      return {
        question: q.question,
        creatorAnswer,
        friendAnswer,
        match
      };
    });

    res.json({
      percentage: latestResponse.percentage || latestResponse.matchScore || 0,
      matchCount: latestResponse.matchCount || comparisons.filter((c: any) => c.match).length,
      totalQuestions: challenge.questions.length,
      comparisons,
      responderName: latestResponse.responderName,
      creatorUsername: challenge.creatorUsername,
      responses: challenge.responses || []
    });
  });

  // TRUTH OR DARE OPEN CHALLENGE
  app.post("/api/truthordare/open-challenge", (req, res) => {
    const { type, question, challengerId } = req.body;
    const challengeId = Math.random().toString(36).substr(2, 10);
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3);

    todChallenges[challengeId] = {
      id: challengeId,
      challengerId: challengerId || "anonymous",
      challengerName: challengerId ? users[challengerId]?.username : "anonymous",
      mode: type,
      question,
      status: "pending",
      isOpen: true,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    saveData();
    res.json({ challengeId });
  });

  // TRUTH OR DARE INVITE API
  app.post("/api/truthordare/create-invite", authenticate, (req: any, res) => {
    const { challengeType, challengeText } = req.body;
    const userId = req.user.uid;
    const user = users[userId];
    const code = Math.random().toString(36).substr(2, 6).toUpperCase();

    todInvites[code] = {
      code,
      creatorId: userId,
      creatorName: user?.username || 'someone',
      challengeType,
      challengeText,
      createdAt: new Date().toISOString()
    };

    saveData();
    res.json({ code });
  });

  // TRUTH OR DARE INBOX SYSTEM
  app.get("/api/truthordare/inbox", authenticate, (req: any, res) => {
    const userId = req.user.uid;
    const user = users[userId];
    // Don't 404 if user profile is missing, just return empty data
    // This happens if server restarted but user is still logged in
    
    const conversations = Object.values(todConversations).filter((c: any) => 
      c.user1Id === userId || c.user2Id === userId
    ).map((c: any) => {
      const msgs = todMessages[c.id] || [];
      const lastMsg = msgs[msgs.length - 1];
      const unreadCount = msgs.filter((m: any) => m.toUserId === userId && !m.readAt).length;
      return { ...c, lastMessage: lastMsg, unreadCount };
    }).sort((a: any, b: any) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

    const totalUnread = Object.values(todMessages).flat().filter((m: any) => 
      m.toUserId === userId && !m.readAt
    ).length;

    res.json({ conversations, unreadCount: totalUnread });
  });

  app.get("/api/truthordare/conversation/:id", authenticate, (req: any, res) => {
    const { id } = req.params;
    const userId = req.user.uid;
    const conv = todConversations[id];

    if (!conv) return res.status(404).json({ error: "Conversation not found" });
    if (conv.user1Id !== userId && conv.user2Id !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const msgs = todMessages[id] || [];
    // Mark as read
    msgs.forEach((m: any) => {
      if (m.toUserId === userId && !m.readAt) {
        m.readAt = new Date().toISOString();
      }
    });
    saveData();

    res.json({ messages: msgs });
  });

  // NOTIFICATIONS SYSTEM
  app.get("/api/notifications", authenticate, (req: any, res) => {
    const userId = req.user.uid;
    const userNotifications = notifications[userId] || [];
    res.json({ notifications: userNotifications });
  });

  app.post("/api/notifications/read", authenticate, (req: any, res) => {
    const userId = req.user.uid;
    const { notificationId } = req.body;
    
    if (!notificationId) {
      if (notifications[userId]) {
        notifications[userId].forEach(n => n.read = true);
      }
    } else {
      const n = (notifications[userId] || []).find(notif => notif.id === notificationId);
      if (n) n.read = true;
    }
    
    saveData();
    res.json({ success: true });
  });

  app.post("/api/notifications/subscribe", authenticate, async (req: any, res) => {
    const userId = req.user.uid;
    const { subscription } = req.body;
    
    if (users[userId]) {
      users[userId].pushSubscription = subscription;
      users[userId].notificationsEnabled = true;
      saveData();
    }
    
    res.json({ success: true });
  });

  // USER SEARCH API
  app.get("/api/users/search", (req, res) => {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.length < 1) {
      return res.json({ users: [], suggestions: [] });
    }
    
    const query = q.toLowerCase().trim().replace(/^@/, '');
    
    // Search in registered users (Direct/Partial Matches)
    const registeredResults = Object.values(users)
      .filter((u: any) => {
        const usernameMatch = u.username && u.username.toLowerCase().includes(query);
        const nameMatch = u.name && u.name.toLowerCase().includes(query);
        const usernameLowerMatch = u.usernameLower && u.usernameLower.includes(query);
        return usernameMatch || nameMatch || usernameLowerMatch;
      })
      .slice(0, 15)
      .map((u: any) => ({
        username: u.username,
        name: u.name || null,
        coinBalance: u.coinBalance || 0,
        totalShares: u.totalShares || 0,
        isAnonymous: false,
        avatarUrl: u.avatarUrl || null
      }));
    
    // Search in anonymous inboxes
    const anonymousResults = Object.keys(anonymousInboxes)
      .filter(username => username.includes(query) && !usernameToId[username])
      .slice(0, 5)
      .map(username => ({
        username,
        name: null,
        coinBalance: 0,
        totalShares: 0,
        isAnonymous: true,
        avatarUrl: null
      }));
    
    // Fuzzy Suggestions (if few direct matches)
    let suggestions: any[] = [];
    if (registeredResults.length < 3 && query.length >= 3) {
      suggestions = Object.values(users)
        .filter((u: any) => u.username)
        .map((u: any) => ({
          username: u.username,
          name: u.name || null,
          distance: getLevenshteinDistance(query, u.username.toLowerCase())
        }))
        .filter(item => item.distance > 0 && item.distance <= 2)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3)
        .map(item => ({
          username: item.username,
          name: item.name,
          isAnonymous: false
        }));
    }
    
    res.json({ 
      users: [...registeredResults, ...anonymousResults],
      suggestions 
    });
  });

  // USER LOOKUP API
  app.get("/api/users/lookup", (req, res) => {
    const { username } = req.query;
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username required' });
    }

    const cleanUsername = username.trim().replace(/^@/, '').toLowerCase();
    const userId = usernameToId[cleanUsername];
    const user = userId ? users[userId] : null;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      username: user.username,
      name: user.name || null,
      coinBalance: user.coinBalance || 0,
      totalShares: user.totalShares || 0,
      avatarUrl: user.avatarUrl || null
    });
  });

  // INVITE API
  app.post("/api/users/invite", (req, res) => {
    const { email, phone, username } = req.body;
    const inviteCode = Math.random().toString(36).substr(2, 8).toUpperCase();
    
    invites[inviteCode] = {
      code: inviteCode,
      invitedBy: username || "anonymous",
      invitedEmail: email,
      invitedPhone: phone,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    saveData();
    res.json({ 
      inviteCode, 
      inviteLink: `https://roastme.site/?ref=${inviteCode}` 
    });
  });

  // USER TRACKING API
  app.post("/api/activity", async (req, res) => {
    const { userId, isAuthenticated, path, ip, userAgent } = req.body;
    if (!userId) return res.json({ success: true });

    if (!userSessions[userId]) {
      userSessions[userId] = {
        id: userId,
        createdAt: new Date().toISOString()
      };
    }

    const session = userSessions[userId];
    session.lastActive = new Date().toISOString();
    session.lastPath = path;
    session.ipAddress = ip;
    session.userAgent = userAgent;
    session.isAuthenticated = isAuthenticated;

    userActivity.push({
      userId,
      path,
      ip,
      timestamp: new Date().toISOString()
    });

    if (isAuthenticated) {
      try {
        const dailyViews = await getDailyActivity(userId, 'PAGE_VIEW');
        if (dailyViews.count < REWARDS.PAGE_VIEW_DAILY_LIMIT) {
          // Award 1 RMP for every 2 views (0.5 RMP average)
          const reward = (dailyViews.count % 2 === 1) ? 1 : 0;
          if (reward > 0) {
            await addRMP(userId, reward, 'PAGE_VIEW', `Browsed around! 🔍`, undefined, dailyViews.count === 1);
          }
        }
      } catch (e) {
        // Silently fail view rewards
      }
    }

    // Keep activity log manageable
    if (userActivity.length > 10000) userActivity.shift();

    saveData();
    res.json({ success: true });
  });

  app.post("/api/activity/ping", authenticate, async (req: any, res) => {
    const userId = req.user.uid;
    // Use the strict time tracking instead of simple addRMP
    await trackTimeSpentStrict(userId, 60);
    res.json({ success: true });
  });

  app.get("/api/user/daily-login-status", authenticate, async (req: any, res) => {
    const userId = req.user.uid;
    try {
      const db = getDb();
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data() || {};
      
      const claimedToday = await hasEarnedToday(userId, 'DAILY_LOGIN_CLAIM');
      
      // Calculate streak bonus based on user's streak count
      const streak = userData.streakCount || 1;
      const streakIndex = Math.min(streak - 1, REWARDS.LOGIN_STREAK_BONUS.length - 1);
      const streakBonus = REWARDS.LOGIN_STREAK_BONUS[streakIndex];
      
      res.json({
        canClaim: !claimedToday,
        streak: streak,
        streakBonus: streakBonus
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch claim status' });
    }
  });

  app.post("/api/user/claim-daily-login", authenticate, async (req: any, res) => {
    try {
      const result = await economyService.claimDailyLogin(req.user.uid);
      res.json({
        success: true,
        reward: result.reward,
        streak: result.streak,
        message: `Claimed ${result.reward} RMP! Streak: ${result.streak} days`,
      });
    } catch (error: any) {
      res.status(400).json({ error: 'Failed to claim daily login. Play fair!' });
    }
  });

  app.post("/api/user/record-time", authenticate, async (req: any, res) => {
    const userId = req.user.uid;
    const { seconds } = req.body;
    try {
      const earned = await trackTimeSpentStrict(userId, seconds || 60);
      await updateQuestProgress(userId, 'feed');
      res.json({ success: true, earned });
    } catch (error) {
      res.status(500).json({ error: 'Failed to track time' });
    }
  });

  app.get("/api/user/remaining-earnings", authenticate, async (req: any, res) => {
    const userId = req.user.uid;
    try {
      const remaining = await getRemainingEarnings(userId);
      res.json(remaining);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch remaining earnings' });
    }
  });

  app.post("/api/activity/share-click-strict", async (req, res) => {
    const { referrerId, linkType } = req.body;
    if (!referrerId || referrerId === 'direct') return res.json({ success: true });
    
    try {
      const dailyClicks = await getDailyActivity(referrerId, 'SHARE_CLICK');
      if (dailyClicks.count >= 50) return res.json({ success: true, limited: true });
      
      let reward = REWARDS.ROAST_SHARE_CLICK;
      if (dailyClicks.count > 10) reward = 0.5;
      if (dailyClicks.count > 20) reward = 0.25;
      if (dailyClicks.count > 30) reward = 0.1;
      
      const finalReward = Math.floor(reward);
      if (finalReward > 0) {
        await addRMP(referrerId, finalReward, 'SHARE_CLICK', `Someone clicked your ${linkType} link`, undefined, dailyClicks.count === 0);
      }
      res.json({ success: true });
    } catch (error) {
      res.json({ success: false });
    }
  });

  // UPDATE PROFILE API
  app.post("/api/user/update-profile", authenticate, (req: any, res) => {
    const { name, notificationsEnabled } = req.body;
    const userId = req.user.uid;

    if (!users[userId]) {
      users[userId] = { 
        id: userId, 
        totalShares: 0, 
        totalRoasts: 0, 
        coinBalance: 0, 
        totalCoinsEarned: 0, 
        rmpBalance: 0, 
        totalRMPEarned: 0, 
        viewCount: 0 
      };
    }

    if (name !== undefined) users[userId].name = name;
    if (notificationsEnabled !== undefined) users[userId].notificationsEnabled = notificationsEnabled;
    
    saveData();
    res.json({ success: true, name: users[userId].name, notificationsEnabled: users[userId].notificationsEnabled });
  });

  // UPDATE AVATAR API
  app.post("/api/user/update-avatar", authenticate, (req: any, res) => {
    const { avatarUrl } = req.body;
    const userId = req.user.uid;
    if (!avatarUrl) return res.status(400).json({ error: 'Avatar URL required' });

    if (!users[userId]) {
      users[userId] = { 
        id: userId, 
        totalShares: 0, 
        totalRoasts: 0, 
        coinBalance: 0, 
        totalCoinsEarned: 0, 
        rmpBalance: 0, 
        totalRMPEarned: 0, 
        viewCount: 0 
      };
    }

    users[userId].avatarUrl = avatarUrl;
    saveData();
    res.json({ success: true, avatarUrl });
  });

  // FRIENDSHIP CHALLENGE API (Old flow - keeping for compatibility)
  app.post("/api/friendship/create-old", (req, res) => {
    const { userId, username, questions, answers } = req.body;
    const challengeId = Math.random().toString(36).substr(2, 12);
    
    friendshipChallenges[challengeId] = {
      id: challengeId,
      creatorId: userId,
      creatorUsername: username,
      questions,
      answers,
      createdAt: new Date().toISOString()
    };
    
    saveData();
    res.json({ challengeId });
  });

  app.get("/api/friendship/:challengeId", (req, res) => {
    const challenge = friendshipChallenges[req.params.challengeId];
    if (!challenge) return res.status(404).json({ error: "Challenge not found" });
    
    // Return only questions, not answers
    res.json({
      id: challenge.id,
      creatorUsername: challenge.creatorUsername,
      questions: challenge.questions
    });
  });

  app.post("/api/friendship/submit", (req, res) => {
    const { challengeId, friendAnswers } = req.body;
    const challenge = friendshipChallenges[challengeId];
    if (!challenge) return res.status(404).json({ error: "Challenge not found" });
    
    let correctCount = 0;
    const totalQuestions = challenge.questions.length;
    
    challenge.questions.forEach((q: string, idx: number) => {
      if (challenge.answers[idx]?.toLowerCase().trim() === friendAnswers[idx]?.toLowerCase().trim()) {
        correctCount++;
      }
    });
    
    const matchPercentage = Math.round((correctCount / totalQuestions) * 100);
    
    res.json({
      matchPercentage,
      myAnswers: challenge.answers,
      friendAnswers
    });
  });

  // ==========================================
  // NEW APIS: LINK RESOLVER, NOTIFICATIONS, TOD
  // ==========================================

  // Resolve custom links: /page/username/id
  app.get("/api/link/resolve/:page/:username/:id", (req, res) => {
    const { page, username, id } = req.params;
    const formattedUsername = username.toLowerCase();

    try {
      switch (page) {
        case 'truthordare':
          // id is messageId
          const conv = Object.values(todConversations).find((c: any) => 
            (c.user1Name === formattedUsername || c.user2Name === formattedUsername) &&
            todMessages[c.id]?.some(m => m.id === id)
          );
          if (conv) {
            const msg = todMessages[conv.id].find(m => m.id === id);
            return res.status(200).json({ conversation: conv, message: msg });
          }
          break;
          
        case 'friendship':
          const friendship = friendshipChallenges[id];
          if (friendship && friendship.creatorUsername.toLowerCase() === formattedUsername) {
            return res.status(200).json(friendship);
          }
          break;
          
        case 'roast':
          const roast = roasts[id];
          if (roast && (roast.username || '').toLowerCase() === formattedUsername) {
            return res.status(200).json(roast);
          }
          break;

        default:
          return res.status(404).json({ error: 'Page context not supported' });
      }
      return res.status(404).json({ error: 'Resource not found' });
    } catch (error) {
      return res.status(500).json({ error: 'Internal error' });
    }
  });

  // REAL-TIME NOTIFICATIONS (SSE)
  app.get("/api/notifications/stream", (req, res) => {
    const userId = req.query.uid as string;
    if (!userId) {
      return res.status(401).end();
    }

    // Set headers for SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`);

    // Poll for new notifications every 2 seconds
    let lastCheck = Date.now();
    
    const interval = setInterval(() => {
      // 1. Check for new notifications
      const userNotifs = notifications[userId] || [];
      const newNotifs = userNotifs.filter(n => new Date(n.createdAt).getTime() > lastCheck && !n.read);
      
      if (newNotifs.length > 0) {
        res.write(`data: ${JSON.stringify({ type: 'notifications', data: newNotifs })}\n\n`);
      }
      
      // 2. Check for new Truth or Dare messages
      const user = users[userId];
      if (user && user.username) {
        const username = user.username.toLowerCase();
        // Look through all active conversations for pending messages to this user
        let newMsgs: any[] = [];
        Object.values(todMessages).forEach(msgs => {
          const fresh = msgs.filter(m => 
            m.toName.toLowerCase() === username && 
            m.status === 'pending' && 
            new Date(m.createdAt).getTime() > lastCheck
          );
          newMsgs = [...newMsgs, ...fresh];
        });
        
        if (newMsgs.length > 0) {
          res.write(`data: ${JSON.stringify({ type: 'messages', data: newMsgs })}\n\n`);
        }
      }
      
      lastCheck = Date.now();
    }, 2000);

    // Clean up on disconnect
    req.on('close', () => {
      clearInterval(interval);
      res.end();
    });
  });

  // TRUTH OR DARE INBOX
  app.get("/api/truthordare/inbox", authenticate, (req: any, res) => {
    const userId = req.user.uid;
    const user = users[userId];
    
    if (!user || !user.username) {
      return res.json({ conversations: [] });
    }
    
    const username = user.username.toLowerCase();
    const userConvs = Object.values(todConversations).filter((c: any) => 
      c.user1Name.toLowerCase() === username || c.user2Name.toLowerCase() === username
    ).map((c: any) => ({
      ...c,
      messages: todMessages[c.id] || []
    }));
    
    // Sort by last message at
    userConvs.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    
    res.json({ conversations: userConvs });
  });

  app.post("/api/truthordare/send-challenge", authenticate, (req: any, res) => {
    const { toUsername, challengeType, challengeText, isInvite } = req.body;
    const fromUserId = req.user.uid;
    const fromUser = users[fromUserId];
    
    if (!fromUser || !fromUser.username) return res.status(403).json({ error: 'Username required' });
    if (!toUsername || !challengeText) return res.status(400).json({ error: 'Missing fields' });
    
    const targetUsername = toUsername.trim().toLowerCase();
    const targetUserId = usernameToId[targetUsername];
    
    if (!targetUserId && !isInvite) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Create/Find conversation
    const fromUsername = fromUser.username.toLowerCase();
    const participants = [fromUsername, targetUsername].sort();
    const convId = `tod_${participants.join('_')}`;
    
    if (!todConversations[convId]) {
      todConversations[convId] = {
        id: convId,
        user1Name: participants[0],
        user2Name: participants[1],
        user1Id: participants[0] === fromUsername ? fromUserId : targetUserId,
        user2Id: participants[1] === fromUsername ? fromUserId : targetUserId,
        createdAt: new Date().toISOString(),
        lastMessageAt: new Date().toISOString()
      };
      todMessages[convId] = [];
    }
    
    const messageId = Math.random().toString(36).substr(2, 9);
    const newMessage = {
      id: messageId,
      fromName: fromUser.username,
      fromId: fromUserId,
      toName: toUsername,
      toId: targetUserId || null,
      challengeType,
      challengeText,
      status: 'pending',
      response: null,
      createdAt: new Date().toISOString()
    };
    
    todMessages[convId].push(newMessage);
    todConversations[convId].lastMessageAt = new Date().toISOString();
    
    if (targetUserId) {
      addNotification(targetUserId, {
        type: 'tod_challenge',
        title: '🎲 New Challenge!',
        body: `${fromUser.username} sent you a ${challengeType}!`,
        link: `/truthordare/inbox`
      });
    }
    
    saveData();
    res.json({ success: true, messageId, conversationId: convId });
  });

  app.post("/api/truthordare/respond", authenticate, (req: any, res) => {
    const { messageId, response } = req.body;
    const userId = req.user.uid;
    const user = users[userId];
    
    if (!user || !user.username) return res.status(403).json({ error: 'Username required' });
    
    // Find message
    let foundMsg: any = null;
    let foundConvId: string | null = null;
    
    for (const [convId, msgs] of Object.entries(todMessages)) {
      const msg = msgs.find(m => m.id === messageId);
      if (msg) {
        foundMsg = msg;
        foundConvId = convId;
        break;
      }
    }
    
    if (!foundMsg || !foundConvId) return res.status(404).json({ error: 'Message not found' });
    
    foundMsg.response = response;
    foundMsg.status = 'responded';
    todConversations[foundConvId].lastMessageAt = new Date().toISOString();
    
    // Notify the challenger
    if (foundMsg.fromId) {
      addNotification(foundMsg.fromId, {
        type: 'tod_response',
        title: '✅ Challenge Accepted!',
        body: `${user.username} responded to your ${foundMsg.challengeType}!`,
        link: `/truthordare/inbox`
      });
      awardRMP(foundMsg.fromId, 10, 'TOD_CHALLENGE_ACCEPTED', `Your challenge to ${user.username} was accepted!`);
      awardRMP(userId, 10, 'TOD_CHALLENGE_ACCEPTED', `You accepted ${foundMsg.fromName}'s challenge!`);
    }
    
    saveData();
    res.json({ success: true });
  });

  app.post("/api/truthordare/solo-complete", authenticate, async (req: any, res) => {
    const { challenge, response } = req.body;
    const userId = req.user.uid;
    
      const dailyTODCount = (await getDailyActivity(userId, 'TOD_SOLO')).count;
      const isFirstOfDay = dailyTODCount === 0;
      const reward = isFirstOfDay ? REWARDS.TOD_CHALLENGE_COMPLETE_FIRST : REWARDS.TOD_CHALLENGE_COMPLETE_EXTRA;
      awardRMP(userId, reward, 'TOD_SOLO', `Completed solo ${challenge.type}: ${challenge.text.substring(0, 20)}...`);
    
    saveData();
    res.json({ success: true });
  });

  
  // ========================================== //
  // ======== TRIVIA ARCADE SYSTEM API ======== //
  // ========================================== //

  app.get("/api/trivia/daily-questions", authenticate, async (req: any, res) => {
    const userId = req.user.uid;
    const today = new Date().toISOString().split('T')[0];
    
    if (!dailyQuestionPools[today]) {
      const shuffled = [...MASTER_QUESTION_BANK].sort(() => Math.random() - 0.5);
      dailyQuestionPools[today] = shuffled.slice(0, 10);
    }
    
    if (!userSeenQuestions[userId]) {
      userSeenQuestions[userId] = {};
    }
    
    const formattedQuestions = dailyQuestionPools[today].map((q: any) => ({
      ...q,
      alreadySeen: !!userSeenQuestions[userId][q.id]
    }));
    
    res.json(formattedQuestions);
  });

  app.post("/api/trivia/daily-questions/seen", authenticate, async (req: any, res) => {
    const userId = req.user.uid;
    const { questionId } = req.body;
    
    if (!userSeenQuestions[userId]) {
      userSeenQuestions[userId] = {};
    }
    userSeenQuestions[userId][questionId] = Date.now();
    res.json({ success: true });
  });

  // Quick Battle
  app.post("/api/trivia/quick-battle/start", authenticate, async (req: any, res) => {
    const userId = req.user.uid;
    const username = users[userId]?.username || "Player";
    
    // Find waiting
    const waitingId = Object.keys(quickBattles).find(
      id => quickBattles[id].status === 'waiting' && quickBattles[id].player1Id !== userId
    );
    
    if (waitingId) {
      const battle = quickBattles[waitingId];
      battle.player2Id = userId;
      battle.player2Name = username;
      battle.status = 'active';
      return res.json({ battle, questions: battle.questions, isNew: false });
    }
    
    // Create new
    const battleId = Math.random().toString(36).substring(2, 10);
    const shuffled = getUnseenQuestions(userId, MASTER_QUESTION_BANK, 5);
    
    quickBattles[battleId] = {
      id: battleId,
      player1Id: userId,
      player1Name: username,
      player1Score: 0,
      player2Score: 0,
      questions: shuffled,
      status: 'waiting',
      createdAt: new Date().toISOString()
    };
    
    res.json({ battle: quickBattles[battleId], questions: shuffled, isNew: true });
  });

  app.get("/api/trivia/quick-battle/:id/status", authenticate, async (req: any, res) => {
    const battleId = req.params.id;
    const battle = quickBattles[battleId];
    if (!battle) return res.status(404).json({ error: "Not found" });
    res.json(battle);
  });

  app.post("/api/trivia/quick-battle/answer", authenticate, async (req: any, res) => {
    const userId = req.user.uid;
    const { battleId, questionIndex, answer, responseTime } = req.body;
    
    const battle = quickBattles[battleId];
    if (!battle) return res.status(404).json({ error: "Not found" });
    
    const isCorrect = battle.questions[questionIndex].correctAnswer === answer;
    const points = isCorrect ? 10 : 0;
    
    if (userId === battle.player1Id) battle.player1Score += points;
    else if (userId === battle.player2Id) battle.player2Score += points;
    
    res.json({ isCorrect, pointsEarned: points });
  });

  app.post("/api/trivia/quick-battle/end", authenticate, async (req: any, res) => {
    const userId = req.user.uid;
    const { battleId } = req.body;
    
    const battle = quickBattles[battleId];
    if (!battle || battle.status === 'completed') return res.json(battle || {});
    
    battle.status = 'completed';
    battle.completedAt = new Date().toISOString();
    
    if (battle.player1Score > battle.player2Score) {
      battle.winnerId = battle.player1Id;
      battle.winnerName = battle.player1Name;
    } else if (battle.player2Score > battle.player1Score) {
      battle.winnerId = battle.player2Id;
      battle.winnerName = battle.player2Name;
    } else {
      battle.winnerId = 'tie';
    }
    
    if (battle.winnerId && battle.winnerId !== 'tie') {
      try {
        await awardRMP(battle.winnerId, 50, 'QUICK_BATTLE_WIN', 'Won quick battle');
        const loser = battle.winnerId === battle.player1Id ? battle.player2Id : battle.player1Id;
        if (loser) await awardRMP(loser, 10, 'QUICK_BATTLE_LOSS', 'Lost quick battle');
      } catch (err) {}
    }
    
    saveData();
    res.json(battle);
  });

  // Gauntlet
  app.post("/api/trivia/gauntlet/start", authenticate, async (req: any, res) => {
    const userId = req.user.uid;
    const username = users[userId]?.username || "Player";
    
    // Find active or create
    const activeRunId = Object.keys(gauntletRuns).find(
      id => gauntletRuns[id].userId === userId && !gauntletRuns[id].completed
    );
    
    if (activeRunId) return res.json(gauntletRuns[activeRunId]);
    
    const runId = Math.random().toString(36).substring(2, 10);
    gauntletRuns[runId] = {
      id: runId,
      userId,
      username,
      score: 0,
      livesUsed: 0,
      highestQuestion: 0,
      completed: false,
      createdAt: new Date().toISOString()
    };
    
    res.json(gauntletRuns[runId]);
  });

  app.get("/api/trivia/gauntlet/question", authenticate, async (req: any, res) => {
    const userId = req.user.uid;
    const shuffled = getUnseenQuestions(userId, MASTER_QUESTION_BANK, 1);
    res.json(shuffled[0]);
  });

  // Room System Endpoints
  app.post("/api/room/create", authenticate, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const username = users[userId]?.username || "Player";
      const { gameType, maxPlayers, gameData } = req.body;
      
      const { roomCode, id } = await roomService.createRoom(userId, username, gameType, maxPlayers || 2, gameData);
      res.json({ roomCode, roomId: id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/room/join", authenticate, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const username = users[userId]?.username || "Player";
      const { roomCode } = req.body;
      
      const room = await roomService.joinRoom(roomCode, userId, username);
      res.json({ room });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/room/ready", authenticate, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const { roomCode } = req.body;
      await roomService.setPlayerReady(roomCode, userId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/room/:code/status", async (req: any, res) => {
    try {
      const { code } = req.params;
      const room = await roomService.getRoomByCode(code);
      if (!room) return res.status(404).json({ error: "Room not found" });
      res.json(room);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/room/:code/action", authenticate, async (req: any, res) => {
    try {
      const { code } = req.params;
      const { gameData, status } = req.body;
      const room = await roomService.getRoomByCode(code);
      if (!room) return res.status(404).json({ error: "Room not found" });
      
      const updateData: any = {};
      if (gameData !== undefined) updateData.gameData = gameData;
      if (status !== undefined) updateData.status = status;
      
      await collections.challengeRooms!.doc(room.id).update(updateData);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/room/matchmake", authenticate, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const username = users[userId]?.username || "Player";
      const { gameType } = req.body;
      
      await roomService.joinMatchmaking(userId, username, gameType);
      
      // Try to find a match immediately
      const match = await roomService.findMatch(gameType);
      if (match) {
        res.json({ status: 'matched', ...match });
      } else {
        res.json({ status: 'queued' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Roast V2 Endpoints
  
  app.post("/api/roast/generate", authenticate, async (req: any, res) => {
    try {
      const result = await generateRoastUnified(req.user.uid, req.body);
      const roastData = {
        ...roasts[result.sessionId],
        rmpAwarded: result.rewards.rmp,
        questCompleted: result.rewards.questCompleted
      };
      res.json({
        success: true,
        roast: roastData
      });
    } catch (err: any) {
      console.error("v2 endpoint error:", err);
      const fallbackText = generatePremiumRoast({ target: 'you', intensity: 'medium', roastType: 'comeback' });
      const sessionId = Math.random().toString(36).substring(2, 15);
      res.json({ 
        success: true,
        roast: {
          id: sessionId,
          text: fallbackText,
          userId: req.user?.uid || 'guest',
          username: 'roaster',
          createdAt: new Date().toISOString(),
          score: 85,
          rating: 'Roasted',
          intensity: 'medium',
          source: 'fallback'
        }
      });
    }
  });

  app.post("/api/roast/rate", authenticate, async (req: any, res) => {
    try {
      const { sessionId, rating } = req.body;
      await updateRoastSession(sessionId, { userRating: rating });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/roast/save", authenticate, async (req: any, res) => {
    try {
      const { sessionId, saved } = req.body;
      await updateRoastSession(sessionId, { saved });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/trivia/gauntlet/answer", authenticate, async (req: any, res) => {
    const userId = req.user.uid;
    const { runId, isCorrect, questionNumber } = req.body;
    
    const run = gauntletRuns[runId];
    if (!run || run.completed || run.userId !== userId) return res.status(404).json({ error: "Run not found" });
    
    let reward = null;
    
    if (isCorrect) {
      const oldScore = run.score;
      run.score += 10;
      
      for (const r of GAUNTLET_REWARDS) {
        if (run.score >= r.milestone && oldScore < r.milestone) {
          try {
            await awardRMP(userId, r.rmp, 'GAUNTLET_MILESTONE', `Reached ${r.milestone} questions in Gauntlet!`);
            // if coins > 0 add coins
          } catch (e) {}
          reward = r;
        }
      }
      
      if (run.score % 100 === 0 && run.score > 0) {
        run.livesUsed = Math.max(0, run.livesUsed - 1);
      }
    } else {
      run.livesUsed += 1;
      if (run.livesUsed >= 3) {
        run.completed = true;
        try {
          await awardRMP(userId, run.score, 'GAUNTLET_FINAL', `Completed Gauntlet with ${run.score} points`);
        } catch (e) {}
      }
    }
    if (questionNumber > run.highestQuestion) {
       run.highestQuestion = questionNumber;
    }
    
    saveData();
    
    res.json({
      newScore: run.score,
      livesLeft: 3 - run.livesUsed,
      gameOver: run.completed,
      reward
    });
  });

  app.get("/api/trivia/gauntlet/leaderboard", async (req: any, res) => {
    const runs = Object.values(gauntletRuns)
      .filter((r: any) => r.completed)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 100);
      
    res.json(runs);
  });

  // BIBLE TRIVIA APIS
  app.get("/api/games/bible-leaderboard", (req, res) => {
    const stats = gameStats['bible-trivia'];
    if (!stats || !stats.highScores) return res.json({ leaderboard: [] });
    
    const leaderboard = Object.entries(stats.highScores)
      .map(([userId, score]: [string, any]) => ({
        username: users[userId]?.username || 'Anonymous',
        score
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
      
    res.json({ leaderboard });
  });

  app.post("/api/games/bible-invite", authenticate, (req: any, res) => {
    const { score } = req.body;
    const userId = req.user.uid;
    const user = users[userId];
    
    if (!user || !user.username) return res.status(400).json({ error: 'Username required' });
    
    const inviteId = Math.random().toString(36).substr(2, 9);
    invites[inviteId] = {
      id: inviteId,
      type: 'bible-trivia',
      creatorId: userId,
      creatorUsername: user.username,
      score,
      createdAt: new Date().toISOString()
    };
    
    const host = process.env.APP_URL || 'https://roastme.site';
    res.json({ inviteLink: `${host}/games/bible-trivia?invite=${inviteId}&from=${user.username}` });
  });

  // Dares API
  app.get("/api/truthordare/dare/active", authenticate, (req: any, res) => {
    const id = req.user.uid;
    const now = new Date();
    const active = traceableDares.filter(d => d.userId === id && d.status === 'pending' && new Date(d.timeLimit) > now);
    res.json({ dares: active });
  });

  app.get("/api/truthordare/combo", authenticate, (req: any, res) => {
    const id = req.user.uid;
    const combo = dareCombos[id] || { currentCombo: 0, longestCombo: 0, comboBonus: 1.0 };
    res.json(combo);
  });

  app.post("/api/truthordare/dare/generate", authenticate, (req: any, res) => {
    const id = req.user.uid;
    const { preferredType } = req.body || {};
    const categories = preferredType ? [preferredType] : Object.keys(DARE_TYPES);
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    
    // Calculate difficulty based on completed dares
    const completedCount = traceableDares.filter(d => d.userId === id && d.status === 'completed').length;
    let difficulty = 'easy';
    if (completedCount >= 50) difficulty = 'hard';
    else if (completedCount >= 20) difficulty = 'medium';
    
    const dareConfig = DARE_TYPES[randomCategory]?.[difficulty] || DARE_TYPES[randomCategory]?.['easy'];
    if (!dareConfig) return res.status(400).json({ error: 'Config missing' });
    
    const timeLimit = new Date();
    timeLimit.setMinutes(timeLimit.getMinutes() + dareConfig.timeLimitMinutes);
    
    const dare = {
      id: Math.random().toString(36).substr(2, 9),
      userId: id,
      dareType: randomCategory,
      dareCategory: difficulty,
      description: dareConfig.description,
      completionCondition: dareConfig.condition,
      redirectUrl: dareConfig.redirect,
      status: 'pending',
      rewardRMP: dareConfig.rewardRMP,
      rewardCoins: 0,
      timeLimit: timeLimit.toISOString(),
      createdAt: new Date().toISOString()
    };
    
    traceableDares.push(dare);
    saveData();
    res.json(dare);
  });

  app.post("/api/truthordare/dare/verify", authenticate, async (req: any, res) => {
    const id = req.user.uid;
    const { dareId, verificationData } = req.body;
    
    const dareIndex = traceableDares.findIndex(d => d.id === dareId && d.userId === id && d.status === 'pending');
    if (dareIndex === -1) return res.status(404).json({ error: 'Dare not found' });
    
    const dare = traceableDares[dareIndex];
    if (new Date() > new Date(dare.timeLimit)) {
      dare.status = 'expired';
      saveData();
      return res.status(400).json({ error: 'Dare expired' });
    }
    
    let completed = false;
    switch (dare.completionCondition) {
      case 'roast_created': completed = verificationData.roastCreated === true; break;
      case 'roast_with_target': completed = verificationData.hasTarget === true; break;
      case 'reactions>=10': completed = (verificationData.reactions || 0) >= 10; break;
      case 'battle_started': completed = verificationData.battleStarted === true; break;
      case 'battle_won': completed = verificationData.battleWon === true; break;
      case 'battle_streak>=3': completed = (verificationData.battleStreak || 0) >= 3; break;
      case 'game_played': completed = verificationData.gamePlayed === true; break;
      case 'score>=70': completed = (verificationData.score || 0) >= 70; break;
      case 'score>=90': completed = (verificationData.score || 0) >= 90; break;
      case 'message_sent': completed = verificationData.messageSent === true; break;
      case 'challenge_sent': completed = verificationData.challengeSent === true; break;
      case 'messages_received>=3': completed = (verificationData.messagesReceived || 0) >= 3; break;
      case 'prank_created': completed = verificationData.prankCreated === true; break;
      case 'prank_shared': completed = verificationData.prankShared === true; break;
      case 'prank_clicks>=5': completed = (verificationData.prankClicks || 0) >= 5; break;
      case 'scroll_time>=120': completed = (verificationData.scrollTime || 0) >= 120; break;
      case 'reactions_given>=10': completed = (verificationData.reactionsGiven || 0) >= 10; break;
      case 'roast_shared': completed = verificationData.roastShared === true; break;
      case 'streak>=3': completed = (verificationData.loginStreak || 0) >= 3; break;
      case 'streak>=7': completed = (verificationData.loginStreak || 0) >= 7; break;
      case 'streak>=30': completed = (verificationData.loginStreak || 0) >= 30; break;
      default: completed = true; // Auto-pass unhandled purely for this prototype if needed, but properly handled above
    }
    
    // In preview context, sometimes it's hard to simulate everything. Provide a debug bypass if verificationData.force === true
    if (verificationData && verificationData.force === true) completed = true;
    
    if (!completed) return res.status(400).json({ error: 'Completion condition not met' });
    
    // Update combo
    let comboObj = dareCombos[id] || { currentCombo: 0, longestCombo: 0, userId: id };
    comboObj.currentCombo += 1;
    comboObj.longestCombo = Math.max(comboObj.longestCombo, comboObj.currentCombo);
    
    let comboBonus = 1.0;
    if (comboObj.currentCombo >= 20) comboBonus = 2.0;
    else if (comboObj.currentCombo >= 10) comboBonus = 1.5;
    else if (comboObj.currentCombo >= 5) comboBonus = 1.25;
    comboObj.comboBonus = comboBonus;
    comboObj.lastCompletedAt = new Date().toISOString();
    dareCombos[id] = comboObj;
    
    const finalRMP = Math.floor(dare.rewardRMP * comboBonus);
    dare.status = 'completed';
    dare.completedAt = new Date().toISOString();
    dare.verificationData = JSON.stringify(verificationData);
    dare.comboCount = comboObj.currentCombo;
    
    await awardRMP(id, finalRMP, 'DARE_COMPLETE', `Completed dare (${comboObj.currentCombo}x combo)`);
    if (dare.rewardCoins > 0) await awardCoins(id, 'DARE_COMPLETE', `Dare bonus coins`);
    
    // Check badges
    if (!dareBadges[id]) dareBadges[id] = [];
    const totalCompleted = traceableDares.filter(d => d.userId === id && d.status === 'completed').length;
    for (const [badgeName, badgeConfig] of Object.entries(BADGES)) {
      if (totalCompleted >= badgeConfig.requirement && !dareBadges[id].some((b: any) => b.id === badgeName)) {
        dareBadges[id].push({ id: badgeName, earnedAt: new Date().toISOString() });
        await awardRMP(id, badgeConfig.rewardRMP, 'BADGE_EARNED', `Earned "${badgeName}" badge`);
      }
    }
    
    saveData();
    res.json({ success: true, reward: finalRMP, combo: comboObj.currentCombo, comboBonus });
  });

  // Roast V2 API Endpoint
  app.post("/api/roast/v2/generate", authenticateMiddleware, async (req: any, res) => {
    try {
      const { systemPrompt, userPrompt } = req.body;
      const ai = getAI();
      if (!ai) {
        return res.status(503).json({ error: 'AI generation is currently disabled' });
      }
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.9,
        }
      });
      res.json({ roastText: response.text || generatePremiumRoast({ target: 'you', intensity: 'medium', roastType: 'comeback' }) });
    } catch (e: any) {
      console.error('Roast V2 Error:', e);
      res.json({ roastText: generatePremiumRoast({ target: 'you', intensity: 'medium', roastType: 'comeback' }) });
    }
  });

  app.post("/api/roast/v2/judge-defense", authenticateMiddleware, async (req: any, res) => {
    try {
      const { comeback, persona } = req.body;
      const ai = getAI();
      if (!ai) {
        return res.json({ quality: "ok", judgmentText: "Acceptable defense." });
      }

      const prompt = `
        A user just tried to defend themselves from a roast.
        Persona that roasted them: ${persona}
        User's Comeback: "${comeback}"

        Judge the quality of this comeback (weak, ok, strong).
        Provide a witty response from the perspective of the ${persona} persona judging this defense.
        
        Return JSON format: { "quality": "weak" | "ok" | "strong", "judgmentText": "..." }
      `;
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text || "";
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        const match = text.match(/\{.*\}/s);
        if (match) result = JSON.parse(match[0]);
        else result = { quality: "ok", judgmentText: "Not bad, I'll allow it." };
      }

      res.json(result);
    } catch (e: any) {
      console.error('Defense Judge Error:', e);
      res.json({ quality: "ok", judgmentText: "Your defense left the AI speechless. We'll call it a draw." });
    }
  });

  // API 404 Catch-All
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: "API endpoint not found" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve static files with long-term caching
    app.use(express.static(distPath, {
      maxAge: '1y',
      immutable: true,
      index: false
    }));

    // Dynamic Metadata Helper
    app.get("*", async (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (!fs.existsSync(indexPath)) {
        return res.status(404).send("App not found");
      }

      let html = fs.readFileSync(indexPath, 'utf8');

      // Detect context (Bible Trivia, Educational Trivia, Football, etc.)
      const isBible = req.path.includes('bible-trivia') || req.path.includes('/arcade/bible');
      const isEdu = req.path.includes('educational-trivia') || req.path.includes('/arcade/education');
      const isFootball = req.path.includes('football-trivia') || req.path.includes('/arcade/football');
      const isArcade = req.path.includes('/arcade/');
      
      const score = req.query.score as string;
      const from = req.query.from as string;

      let dynamicTitle = "ROASTME ARCADE";
      let dynamicDesc = "The ultimate challenge awaits. Can you survive the roast?";

      if (isFootball) {
        dynamicTitle = "⚽ FOOTBALL TRIVIA";
        dynamicDesc = "I scored {score} in Football Trivia… can you beat me? 😈";
      } else if (isBible) {
        dynamicTitle = "✝️ BIBLE TRIVIA";
        dynamicDesc = "Test your knowledge of the Word. My score: {score} pts!";
      } else if (isEdu) {
        dynamicTitle = "🎓 EDUCATIONAL QUIZ";
        dynamicDesc = "Brain power test! I scored {score} points. Can you beat me?";
      } else if (isArcade) {
        dynamicTitle = "🎮 ROASTME GAMES";
        dynamicDesc = "Join the arcade! High score: {score} 🔥 your turn.";
      }

      // Handle score injection
      const finalScore = score || "1400";
      dynamicDesc = dynamicDesc.replace('{score}', finalScore);

      if (from && !score) {
        dynamicDesc = `@${from} challenged you to a game! ⚔️`;
      }

      // Force inject clean meta tags on ALL requests to override any potential staleness
      html = html.replace(/<title>.*?<\/title>/, `<title>${dynamicTitle}</title>\n    <link rel="canonical" href="https://roastme.site${req.path}" />`);
      html = html.replace(/property="og:url" content=".*?"/g, `property="og:url" content="https://roastme.site${req.originalUrl || req.url}"`);
      html = html.replace(/property="og:title" content=".*?"/g, `property="og:title" content="${dynamicTitle}"`);
      html = html.replace(/property="og:description" content=".*?"/g, `property="og:description" content="${dynamicDesc}"`);
      html = html.replace(/name="description" content=".*?"/g, `name="description" content="${dynamicDesc}"`);
      html = html.replace(/property="twitter:title" content=".*?"/g, `property="twitter:title" content="${dynamicTitle}"`);
      html = html.replace(/property="twitter:url" content=".*?"/g, `property="twitter:url" content="https://roastme.site${req.originalUrl || req.url}"`);
      html = html.replace(/property="twitter:description" content=".*?"/g, `property="twitter:description" content="${dynamicDesc}"`);

      res.set('Content-Type', 'text/html');
      res.send(html);
    });
  }

  // Global Error Handler to always return JSON for API requests
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Express Error Handler caught error:', err);
    if (!res.headersSent) {
      const isApi = (req.originalUrl || req.url || '').startsWith('/api/');
      const wantsJson = req.headers.accept?.includes('application/json');
      if (isApi || wantsJson) {
         res.status(500).json({ error: 'Internal Server Error', details: err?.message || 'Unknown error' });
      } else {
         res.status(500).send('Internal Server Error');
      }
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ROASTME running on port ${PORT} with scalability enhancements.`);
    
    // Cleanup expired prank photos every hour
    setInterval(() => {
      const now = new Date();
      const tempDir = path.join(process.cwd(), "public", "temp");
      let changed = false;

      Object.keys(prankLinks).forEach(id => {
        const prank = prankLinks[id];
        if (prank.photoUrl && prank.photoExpiresAt) {
          const expiresAt = new Date(prank.photoExpiresAt);
          if (now > expiresAt) {
            // Delete file
            const fileName = path.basename(prank.photoUrl);
            const filePath = path.join(tempDir, fileName);
            if (fs.existsSync(filePath)) {
              try {
                fs.unlinkSync(filePath);
              } catch (e) {
                console.error(`Failed to delete expired photo ${filePath}:`, e);
              }
            }
            // Clear from data
            prank.photoUrl = null;
            prank.photoExpiresAt = null;
            changed = true;
          }
        }
      });

      if (changed) {
        saveData();
      }
    }, 60 * 60 * 1000);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
