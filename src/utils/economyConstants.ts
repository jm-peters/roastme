// src/utils/economyConstants.ts - HARDENED PAIDTASK-STYLE ECONOMY

// ============================================
// STRICT ECONOMY CONSTANTS - DESIGNED FOR MONTHS TO REACH THRESHOLD
// ============================================
export const ECONOMY = {
  RMP_TO_COIN: 100,        // 100 RMP = 1 Coin (unchanged)
  COIN_TO_USD: 1000,       // 1000 Coins = $1 USD (unchanged)
  MINIMUM_WITHDRAWAL: 10000, // 10,000 Coins = $10 USD minimum payout
  DEFAULT_RATE: 0.000001   // 1 Coin = $0.001 USD (for display)
};

// ============================================
// STRICT REWARD VALUES - REDUCED TO PREVENT FAST EARNINGS
// ============================================
export const REWARDS = {
  // Roast Actions - Strict limits
  ROAST_CREATE_FIRST: 20,      // ONLY first roast of the day
  ROAST_CREATE_EXTRA: 1,       // Each additional roast (max 10 per day)
  ROAST_SHARE: 10,             // Reduced from 20
  ROAST_SHARE_CLICK: 1,        // Reduced from 5
  ROAST_DAILY_LIMIT: 10,       // Max roasts that earn per day
  
  // Challenge Actions - One-time rewards
  CHALLENGE_COMPLETE_FIRST: 20,  // Only first challenge of the day
  CHALLENGE_COMPLETE_EXTRA: 2,   // Each additional (max 5)
  CHALLENGE_SHARE: 10,
  CHALLENGE_DAILY_LIMIT: 5,
  
  // Anonymous Messages - Diminishing returns
  ANON_LINK_CREATE: 10,          // One-time per link
  ANON_MESSAGE_RECEIVED_FIRST: 20, // First message of the day
  ANON_MESSAGE_RECEIVED_EXTRA: 2,  // Each additional (max 10)
  ANON_DAILY_LIMIT: 10,
  
  // Truth or Dare - Very low rewards
  TOD_SOLO_PLAY: 1,              // Reduced from 2
  TOD_CHALLENGE_SEND: 5,         // Reduced
  TOD_CHALLENGE_COMPLETE_FIRST: 20,
  TOD_CHALLENGE_COMPLETE_EXTRA: 2,
  TOD_DAILY_LIMIT: 5,
  
  // Prank Actions
  PRANK_CREATE: 5,               // Reduced from 10
  PRANK_SHARE: 10,
  PRANK_SHARE_CLICK: 1,
  PRANK_DAILY_LIMIT: 5,
  
  // Games - One-time per game per day
  GAME_PLAY_FIRST: 5,            // First game of the day
  GAME_PLAY_EXTRA: 1,            // Each additional (max 5)
  GAME_COMPLETE_FIRST: 20,       // First completion of the day
  GAME_COMPLETE_EXTRA: 2,        // Each additional (max 3)
  GAME_DAILY_LIMIT: 5,
  
  // Referrals - Strict one-time
  REFERRAL_SIGNUP: 25,           // Reduced from 50
  REFERRAL_COMPLETE: 50,         // Reduced from 100 (when referred user completes 10 actions)
  REFERRAL_CLICK: 1,
  REFERRAL_MAX_PER_DAY: 5,       // Max referral earnings per day
  
  // Daily Login - MUST BE CLAIMED MANUALLY
  DAILY_LOGIN: 50,               // Only if claimed, not automatic
  LOGIN_STREAK_BONUS: [10, 15, 20, 25, 30, 35, 40, 45, 50, 60], // Day 1-10 streak
  
  // Time Spent - DIMINISHING RETURNS (starts high, decreases over time)
  TIME_SPENT_FIRST_MINUTE: 2,     // First minute of the day
  TIME_SPENT_MINUTE_DECAY: 0.5,   // Each subsequent minute earns 0.5 less
  TIME_SPENT_MAX_PER_DAY: 30,    // Max 30 minutes earning per day
  TIME_SPENT_COOLDOWN: 60,        // Cooldown before earning starts again
  
  // Page Views - Very low passive earning
  PAGE_VIEW: 0.5,                 // 0.5 RMP per page view (rounded down)
  PAGE_VIEW_DAILY_LIMIT: 50,      // Max 50 page views earning per day
  
  // Mixed / Missing Actions
  WELCOME_BONUS: 100,
  REACTION_RECEIVED: 1,
  BATTLE_WIN: 10,
  REMIX: 5,
};
