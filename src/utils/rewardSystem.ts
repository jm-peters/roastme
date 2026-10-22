// src/utils/rewardSystem.ts - REWARD RULES & UTILITIES

export const REWARD_RULES = {
  ROAST_GENERATED: { rmp: 10, coins: 0 },
  ROAST_SHARED: { rmp: 50, coins: 1 },
  BATTLE_VOTE: { rmp: 5, coins: 0 },
  BATTLE_WIN: { rmp: 100, coins: 5 },
  REMIX_CREATED: { rmp: 30, coins: 2 },
  REACTION_RECEIVED: { rmp: 2, coins: 0 },
  DAILY_LOGIN: { rmp: 20, coins: 5 },
  CHALLENGE_COMPLETED: { rmp: 200, coins: 10 },
  REFERRAL_SUCCESS: { rmp: 500, coins: 25 },
};

export const BATTLE_COST = 100; // RMP to enter battle
export const CONVERSION_RATE = 100; // 100 RMP = 1 Coin

export interface Transaction {
  id: string;
  type: 'RMP' | 'COIN';
  amount: number;
  reason: string;
  timestamp: string;
}

export const calculateLevel = (rmp: number) => {
  return Math.floor(Math.sqrt(rmp / 100)) + 1;
};

export const getLevelProgress = (rmp: number) => {
  const currentLevel = calculateLevel(rmp);
  const currentLevelRmp = Math.pow(currentLevel - 1, 2) * 100;
  const nextLevelRmp = Math.pow(currentLevel, 2) * 100;
  const progress = ((rmp - currentLevelRmp) / (nextLevelRmp - currentLevelRmp)) * 100;
  return Math.min(100, Math.max(0, progress));
};
