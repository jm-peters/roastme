import { economyService, REWARDS, ECONOMY } from '../services/economyService.ts';

export async function getDailyActivity(userId: string, activityType: string) {
  return economyService.getDailyActivity(userId, activityType);
}

export async function getTimeSpentToday(userId: string): Promise<number> {
  const daily = await economyService.getDailyActivity(userId, 'TIME_SPENT');
  return daily.totalEarned;
}

export async function addRMP(
  userId: string,
  amount: number,
  type: string,
  description: string,
  relatedId?: string,
  isFirstOfDay: boolean = false
) {
  const result = await economyService.addRMP(userId, amount, type, description, relatedId, isFirstOfDay);
  return {
    ...result,
    rmpBalance: result.newRMP,
    coinBalance: result.newCoins,
    usdEquivalent: result.newCoins * ECONOMY.DEFAULT_RATE
  };
}

export async function trackTimeSpentStrict(userId: string, seconds: number): Promise<number> {
  return economyService.trackTimeSpent(userId, seconds);
}

export async function claimDailyLogin(userId: string): Promise<number> {
  const result = await economyService.claimDailyLogin(userId);
  return result.reward;
}

export async function hasEarnedToday(userId: string, type: string): Promise<boolean> {
  const activity = await economyService.getDailyActivity(userId, type);
  return activity.count > 0;
}

export async function getRemainingEarnings(userId: string): Promise<Record<string, number>> {
  const stats = await economyService.getUserEconomyStats(userId);
  return {
    roastsRemaining: stats.dailyRemaining.roasts,
    challengesRemaining: stats.dailyRemaining.challenges,
    timeMinutesRemaining: stats.dailyRemaining.timeMinutes
  };
}

export async function getUserEconomyStats(userId: string) {
  return economyService.getUserEconomyStats(userId);
}
