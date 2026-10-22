// src/services/economyService.ts
import { firestore, collections, FieldValue, Timestamp } from '../lib/firebase-admin.ts';
import { userService, AppUser } from './userService.ts';

// ============================================
// STRICT ECONOMY CONSTANTS
// ============================================
export const ECONOMY = {
  RMP_TO_COIN: 100,
  COIN_TO_USD: 1000,
  MINIMUM_WITHDRAWAL: 10000,
  DEFAULT_RATE: 0.000001,
};

export const REWARDS = {
  // Roast Actions - Strict limits
  ROAST_CREATE_FIRST: 20,      // ONLY first roast of the day
  ROAST_CREATE_EXTRA: 1,       // Each additional roast (max 10 per day)
  ROAST_SHARE: 10,             
  ROAST_SHARE_CLICK: 1,        
  ROAST_DAILY_LIMIT: 10,       
  
  // Challenge Actions - One-time rewards
  CHALLENGE_COMPLETE_FIRST: 20,  
  CHALLENGE_COMPLETE_EXTRA: 2,   
  CHALLENGE_SHARE: 10,
  CHALLENGE_DAILY_LIMIT: 5,
  
  // Anonymous Messages - Diminishing returns
  ANON_LINK_CREATE: 10,          
  ANON_MESSAGE_RECEIVED_FIRST: 20, 
  ANON_MESSAGE_RECEIVED_EXTRA: 2,  
  ANON_DAILY_LIMIT: 10,
  ANON_DAILY_LIMIT_MESSAGES: 10, // Alias
  
  // Truth or Dare - Very low rewards
  TOD_SOLO_PLAY: 1,              
  TOD_CHALLENGE_SEND: 5,         
  TOD_CHALLENGE_COMPLETE_FIRST: 20,
  TOD_CHALLENGE_COMPLETE_EXTRA: 2,
  TOD_DAILY_LIMIT: 5,
  
  // Prank Actions
  PRANK_CREATE: 5,               
  PRANK_SHARE: 10,
  PRANK_SHARE_CLICK: 1,
  PRANK_DAILY_LIMIT: 5,
  
  // Games - One-time per game per day
  GAME_PLAY_FIRST: 5,            
  GAME_PLAY_EXTRA: 1,            
  GAME_COMPLETE_FIRST: 20,       
  GAME_COMPLETE_EXTRA: 2,        
  GAME_DAILY_LIMIT: 5,
  
  // Referrals - Strict one-time
  REFERRAL_SIGNUP: 25,           
  REFERRAL_COMPLETE: 50,         
  REFERRAL_CLICK: 1,
  REFERRAL_MAX_PER_DAY: 5,       
  
  // Daily Login - MUST BE CLAIMED MANUALLY
  DAILY_LOGIN: 50,               
  LOGIN_STREAK_BONUS: [10, 15, 20, 25, 30, 35, 40, 45, 50, 60], 
  
  // Time Spent - DIMINISHING RETURNS
  TIME_SPENT_FIRST_MINUTE: 2,     
  TIME_SPENT_MINUTE_DECAY: 0.5,   
  TIME_SPENT_MAX_MINUTES: 30,    
  TIME_SPENT_MAX_PER_DAY: 30, // Alias
  TIME_SPENT_COOLDOWN: 60,        
  
  // Page Views - Very low passive earning
  PAGE_VIEW: 0.5,                 
  PAGE_VIEW_DAILY_LIMIT: 50,      
  
  // Extras
  WELCOME_BONUS: 100,
  REACTION_RECEIVED: 1,
  BATTLE_WIN: 10,
  REMIX: 5,
  SHARE: 10,
  SHARE_CLICK: 1,
  SHARE_CLICK_DAILY_LIMIT: 50,
};

interface DailyActivity {
  count: number;
  totalEarned: number;
  lastActivityAt: Date | null;
}

export class EconomyService {
  private static instance: EconomyService;
  
  static getInstance(): EconomyService {
    if (!EconomyService.instance) {
      EconomyService.instance = new EconomyService();
    }
    return EconomyService.instance;
  }
  
  // Get daily activity count for a user
  async getDailyActivity(userId: string, activityType: string): Promise<DailyActivity> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const statsDoc = await collections.dailyStats!.doc(`${userId}_${activityType}_${today.toISOString().split('T')[0]}`).get();
    
    if (!statsDoc.exists) {
      return { count: 0, totalEarned: 0, lastActivityAt: null };
    }
    
    const data = statsDoc.data();
    return {
      count: data?.count || 0,
      totalEarned: data?.totalEarned || 0,
      lastActivityAt: data?.lastActivityAt?.toDate() || null,
    };
  }
  
  // Update daily activity
  private async updateDailyActivity(userId: string, activityType: string, amount: number): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const docId = `${userId}_${activityType}_${today.toISOString().split('T')[0]}`;
    
    await collections.dailyStats!.doc(docId).set({
      userId,
      activityType,
      date: Timestamp.fromDate(today),
      count: FieldValue.increment(1),
      totalEarned: FieldValue.increment(amount),
      lastActivityAt: Timestamp.now(),
    }, { merge: true });
  }
  
  // Calculate diminishing returns
  private calculateReward(baseReward: number, count: number, _maxCount: number): number {
    if (count === 0) return baseReward;
    if (count === 1) return Math.floor(baseReward * 0.5);
    if (count === 2) return Math.floor(baseReward * 0.25);
    return Math.floor(baseReward * 0.1);
  }
  
  // Add RMP to user
  async addRMP(
    userId: string,
    baseAmount: number,
    type: string,
    description: string,
    relatedId?: string,
    isFirstOfDay: boolean = false
  ): Promise<{ awarded: boolean; amount: number; newRMP: number; newCoins: number }> {
    
    // Check daily limits
    let maxPerDay = 0;
    switch (type) {
      case 'ROAST_CREATE':
        maxPerDay = REWARDS.ROAST_DAILY_LIMIT;
        break;
      case 'CHALLENGE_COMPLETE':
        maxPerDay = REWARDS.CHALLENGE_DAILY_LIMIT;
        break;
      case 'SHARE_CLICK':
        maxPerDay = REWARDS.SHARE_CLICK_DAILY_LIMIT;
        break;
      case 'GAME_COMPLETE':
        maxPerDay = REWARDS.GAME_DAILY_LIMIT;
        break;
      default:
        maxPerDay = 999;
    }
    
    const daily = await this.getDailyActivity(userId, type);
    
    if (daily.count >= maxPerDay) {
      return { awarded: false, amount: 0, newRMP: 0, newCoins: 0 };
    }
    
    // Calculate final amount with diminishing returns
    let finalAmount = baseAmount;
    if (!isFirstOfDay && daily.count > 0) {
      finalAmount = this.calculateReward(baseAmount, daily.count, maxPerDay);
    }
    
    if (finalAmount <= 0) {
      return { awarded: false, amount: 0, newRMP: 0, newCoins: 0 };
    }
    
    // Get user and update in transaction
    const userRef = collections.users!.doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.log(`[ECONOMY] Award skipped: User ${userId} profile not found (likely unregistered)`);
      return { awarded: false, amount: 0, newRMP: 0, newCoins: 0 };
    }
    
    const userData = userDoc.data()!;
    let currentRMP = userData.rmpBalance || 0;
    let currentCoins = userData.coinBalance || 0;
    
    const newRMP = currentRMP + finalAmount;
    
    // Auto-convert to coins if threshold reached
    let coinsToAdd = 0;
    let remainingRMP = newRMP;
    
    if (newRMP >= ECONOMY.RMP_TO_COIN) {
      coinsToAdd = Math.floor(newRMP / ECONOMY.RMP_TO_COIN);
      remainingRMP = newRMP % ECONOMY.RMP_TO_COIN;
    }
    
    // Use Firestore transaction for consistency
    await firestore.runTransaction(async (transaction) => {
      transaction.update(userRef, {
        rmpBalance: remainingRMP,
        coinBalance: FieldValue.increment(coinsToAdd),
        totalRMPEarned: FieldValue.increment(finalAmount),
        totalCoinsEarned: FieldValue.increment(coinsToAdd),
        usdEarned: FieldValue.increment(coinsToAdd * ECONOMY.DEFAULT_RATE),
      });
      
      // Add RMP transaction record
      const rmpTxRef = collections.rmpTransactions!.doc();
      transaction.set(rmpTxRef, {
        userId,
        amount: finalAmount,
        type,
        description,
        relatedId: relatedId || null,
        createdAt: Timestamp.now(),
      });
      
      // Add coin transaction if conversion happened
      if (coinsToAdd > 0) {
        const coinTxRef = collections.coinTransactions!.doc();
        transaction.set(coinTxRef, {
          userId,
          amount: coinsToAdd,
          rmpConverted: finalAmount,
          type: 'RMP_CONVERSION',
          description: `Auto-converted ${finalAmount} RMP to ${coinsToAdd} coins`,
          balanceAfter: currentCoins + coinsToAdd,
          createdAt: Timestamp.now(),
        });
      }
    });
    
    // Update daily stats
    await this.updateDailyActivity(userId, type, finalAmount);
    
    return {
      awarded: true,
      amount: finalAmount,
      newRMP: remainingRMP,
      newCoins: currentCoins + coinsToAdd,
    };
  }
  
  // Claim daily login (must be claimed manually)
  async claimDailyLogin(userId: string): Promise<{ awarded: boolean; reward: number; streak: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if already claimed today
    const alreadyClaimed = await this.getDailyActivity(userId, 'DAILY_LOGIN_CLAIM');
    if (alreadyClaimed.count > 0) {
      throw new Error('Daily login already claimed today');
    }
    
    // Calculate streak
    let streak = 1;
    const lastClaimQuery = await collections.rmpTransactions!
      .where('userId', '==', userId)
      .where('type', '==', 'DAILY_LOGIN_CLAIM')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    
    if (!lastClaimQuery.empty) {
      const lastClaim = lastClaimQuery.docs[0].data();
      const lastDate = lastClaim.createdAt.toDate();
      const lastMidnight = new Date(lastDate);
      lastMidnight.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - lastMidnight.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        const userRef = collections.users!.doc(userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data() || {};
        streak = (userData.streakCount || 0) + 1;
        
        // Update the streak in the database
        await userRef.update({
          streakCount: streak,
          longestStreak: Math.max(userData.longestStreak || 0, streak)
        });

        // Sync with roastProfiles for frontend display in RoastSessionV2
        try {
          const profileRef = firestore.collection('roastProfiles').doc(userId);
          await profileRef.set({
            streakCount: streak,
            longestStreak: Math.max(userData.longestStreak || 0, streak)
          }, { merge: true });
        } catch (e) {
          console.error('Failed to sync roastProfile streak:', e);
        }
      } else if (diffDays === 0) {
        throw new Error('Daily login already claimed today');
      } else {
        streak = 1;
        const userRef = collections.users!.doc(userId);
        await userRef.update({
          streakCount: 1
        });

        // Sync with roastProfiles
        try {
          const profileRef = firestore.collection('roastProfiles').doc(userId);
          await profileRef.set({ streakCount: 1 }, { merge: true });
        } catch (e) {
          console.error('Failed to reset roastProfile streak:', e);
        }
      }
    } else {
      // First time claiming ever
      streak = 1;
      const userRef = collections.users!.doc(userId);
      await userRef.update({
        streakCount: 1
      });

      // Sync with roastProfiles
      try {
        const profileRef = firestore.collection('roastProfiles').doc(userId);
        await profileRef.set({ streakCount: 1 }, { merge: true });
      } catch (e) {
        console.error('Failed to initialize roastProfile streak:', e);
      }
    }
    
    const streakIndex = Math.min(streak - 1, REWARDS.LOGIN_STREAK_BONUS.length - 1);
    const bonus = REWARDS.LOGIN_STREAK_BONUS[streakIndex];
    const totalReward = REWARDS.DAILY_LOGIN + (bonus || 0);
    
    const result = await this.addRMP(userId, totalReward, 'DAILY_LOGIN_CLAIM', `Daily login claim - Streak: ${streak} days`, undefined, true);
    
    if (!result.awarded) {
      throw new Error('Failed to award daily login');
    }
    
    return { awarded: true, reward: totalReward, streak };
  }
  
  // Track time spent (diminishing returns)
  async trackTimeSpent(userId: string, seconds: number): Promise<number> {
    const minutes = Math.floor(seconds / 60);
    if (minutes <= 0) return 0;
    
    const dailyTime = await this.getDailyActivity(userId, 'TIME_SPENT');
    const minutesEarnedToday = Math.floor(dailyTime.totalEarned);
    
    if (minutesEarnedToday >= REWARDS.TIME_SPENT_MAX_MINUTES) {
      return 0;
    }
    
    let totalEarned = 0;
    const minutesToEarn = Math.min(minutes, REWARDS.TIME_SPENT_MAX_MINUTES - minutesEarnedToday);
    
    for (let i = 0; i < minutesToEarn; i++) {
      const minuteNumber = minutesEarnedToday + i;
      let reward = 0;
      if (minuteNumber === 0) reward = REWARDS.TIME_SPENT_FIRST_MINUTE;
      else if (minuteNumber === 1) reward = 1.5;
      else if (minuteNumber === 2) reward = 1;
      else if (minuteNumber === 3) reward = 0.5;
      else reward = 0.25;
      totalEarned += reward;
    }
    
    const roundedEarned = Math.floor(totalEarned);
    
    if (roundedEarned > 0) {
      await this.addRMP(userId, roundedEarned, 'TIME_SPENT', `Spent ${minutesToEarn} minutes on app`, undefined, minutesEarnedToday === 0);
    }
    
    return roundedEarned;
  }
  
  // Convert RMP to Coins manually
  async convertRMPToCoins(userId: string): Promise<{ rmpLeft: number; coinsAdded: number }> {
    const userRef = collections.users!.doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data()!;
    const currentRMP = userData.rmpBalance || 0;
    
    if (currentRMP < ECONOMY.RMP_TO_COIN) {
      throw new Error(`Need at least ${ECONOMY.RMP_TO_COIN} RMP to convert`);
    }
    
    const coinsToAdd = Math.floor(currentRMP / ECONOMY.RMP_TO_COIN);
    const remainingRMP = currentRMP % ECONOMY.RMP_TO_COIN;
    
    await firestore.runTransaction(async (transaction) => {
      transaction.update(userRef, {
        rmpBalance: remainingRMP,
        coinBalance: FieldValue.increment(coinsToAdd),
        totalCoinsEarned: FieldValue.increment(coinsToAdd),
        usdEarned: FieldValue.increment(coinsToAdd * ECONOMY.DEFAULT_RATE),
      });
      
      const coinTxRef = collections.coinTransactions!.doc();
      transaction.set(coinTxRef, {
        userId,
        amount: coinsToAdd,
        rmpConverted: currentRMP - remainingRMP,
        type: 'MANUAL_CONVERSION',
        description: `Manually converted ${currentRMP - remainingRMP} RMP to ${coinsToAdd} coins`,
        balanceAfter: (userData.coinBalance || 0) + coinsToAdd,
        createdAt: Timestamp.now(),
      });
    });
    
    return { rmpLeft: remainingRMP, coinsAdded: coinsToAdd };
  }
  
  // Get user economy stats
  async getUserEconomyStats(userId: string): Promise<any> {
    const user = await userService.getUserById(userId);
    
    if (!user) {
      console.log(`[ECONOMY] Returning zeroed stats for unregistered user ${userId}`);
      return {
        rmpBalance: 0,
        coinBalance: 0,
        totalRMPEarned: 0,
        totalCoinsEarned: 0,
        usdValue: 0,
        progressToWithdrawal: 0,
        nextMilestone: ECONOMY.MINIMUM_WITHDRAWAL,
        streakFreezeAvailable: 0,
        avatarFrame: 'default',
        profileBg: 'default',
        dailyRemaining: {
          roasts: REWARDS.ROAST_DAILY_LIMIT,
          challenges: REWARDS.CHALLENGE_DAILY_LIMIT,
          games: REWARDS.GAME_DAILY_LIMIT,
          timeMinutes: REWARDS.TIME_SPENT_MAX_MINUTES,
        },
        stats: {
          totalShares: 0,
          totalReferrals: 0,
          totalRoasts: 0,
          totalChallenges: 0,
          totalGamesPlayed: 0,
        },
      };
    }
    
    const usdValue = user.coinBalance / ECONOMY.COIN_TO_USD;
    const progressToWithdrawal = (user.coinBalance / ECONOMY.MINIMUM_WITHDRAWAL) * 100;
    
    // Get remaining daily limits
    const roastDaily = await this.getDailyActivity(userId, 'ROAST_CREATE');
    const challengeDaily = await this.getDailyActivity(userId, 'CHALLENGE_COMPLETE');
    const gameDaily = await this.getDailyActivity(userId, 'GAME_COMPLETE');
    const timeSpent = await this.getDailyActivity(userId, 'TIME_SPENT');
    
    return {
      rmpBalance: user.rmpBalance,
      coinBalance: user.coinBalance,
      totalRMPEarned: user.totalRMPEarned,
      totalCoinsEarned: user.totalCoinsEarned,
      usdValue,
      progressToWithdrawal: Math.min(100, progressToWithdrawal),
      nextMilestone: ECONOMY.MINIMUM_WITHDRAWAL - user.coinBalance,
      streakFreezeAvailable: user.streakFreezeAvailable || 0,
      avatarFrame: user.avatarFrame || 'default',
      profileBg: user.profileBg || 'default',
      roastTitle: user.roastTitle || null,
      dailyRemaining: {
        roasts: Math.max(0, REWARDS.ROAST_DAILY_LIMIT - roastDaily.count),
        challenges: Math.max(0, REWARDS.CHALLENGE_DAILY_LIMIT - challengeDaily.count),
        games: Math.max(0, REWARDS.GAME_DAILY_LIMIT - gameDaily.count),
        timeMinutes: Math.max(0, REWARDS.TIME_SPENT_MAX_MINUTES - Math.floor(timeSpent.totalEarned)),
      },
      stats: {
        totalShares: user.totalShares,
        totalReferrals: user.totalReferrals,
        totalRoasts: user.totalRoasts,
        totalChallenges: user.totalChallenges,
        totalGamesPlayed: user.totalGamesPlayed,
      },
    };
  }

  // --- NEW FEATURES ---

  async dailySpin(userId: string): Promise<any> {
    const today = new Date().toISOString().split('T')[0];
    const spinDoc = await collections.spinHistory!.doc(`${userId}_${today}`).get();
    
    if (spinDoc.exists) {
      throw new Error('Already spun today');
    }

    const REWARDS_POOL = [
      { type: 'rmp', amount: 5, weight: 40 },
      { type: 'rmp', amount: 10, weight: 25 },
      { type: 'rmp', amount: 25, weight: 15 },
      { type: 'rmp', amount: 50, weight: 8 },
      { type: 'coins', amount: 1, weight: 5 },
      { type: 'coins', amount: 2, weight: 3 },
      { type: 'coins', amount: 5, weight: 2 },
      { type: 'streak_freeze', amount: 1, weight: 1 },
      { type: 'rmp', amount: 100, weight: 0.5 },
      { type: 'coins', amount: 10, weight: 0.5 },
    ];

    const totalWeight = REWARDS_POOL.reduce((sum, r) => sum + r.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedReward = REWARDS_POOL[0];
    
    for (const r of REWARDS_POOL) {
      if (random < r.weight) {
        selectedReward = r;
        break;
      }
      random -= r.weight;
    }

    await firestore.runTransaction(async (transaction) => {
      // Record spin
      transaction.set(collections.spinHistory!.doc(`${userId}_${today}`), {
        userId,
        date: today,
        reward: selectedReward.amount,
        rewardType: selectedReward.type,
        createdAt: Timestamp.now()
      });

      // Award reward
      if (selectedReward.type === 'rmp') {
        // addRMP logic but integrated in transaction
        const userRef = collections.users!.doc(userId);
        const userDoc = await transaction.get(userRef);
        if (userDoc.exists) {
          const userData = userDoc.data()!;
          const newRmp = (userData.rmpBalance || 0) + selectedReward.amount;
          let coinsToAdd = 0;
          let finalRmp = newRmp;
          if (newRmp >= ECONOMY.RMP_TO_COIN) {
            coinsToAdd = Math.floor(newRmp / ECONOMY.RMP_TO_COIN);
            finalRmp = newRmp % ECONOMY.RMP_TO_COIN;
          }
          transaction.update(userRef, {
            rmpBalance: finalRmp,
            coinBalance: FieldValue.increment(coinsToAdd),
            totalRMPEarned: FieldValue.increment(selectedReward.amount),
            totalCoinsEarned: FieldValue.increment(coinsToAdd)
          });
        }
      } else if (selectedReward.type === 'coins') {
        transaction.update(collections.users!.doc(userId), {
          coinBalance: FieldValue.increment(selectedReward.amount),
          totalCoinsEarned: FieldValue.increment(selectedReward.amount)
        });
      } else if (selectedReward.type === 'streak_freeze') {
        transaction.update(collections.users!.doc(userId), {
          streakFreezeAvailable: FieldValue.increment(selectedReward.amount)
        });
      }
    });

    return selectedReward;
  }

  async buyStreakFreeze(userId: string): Promise<void> {
    const cost = 10;
    const userRef = collections.users!.doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) throw new Error('User not found');
    const userData = userDoc.data()!;
    if ((userData.coinBalance || 0) < cost) throw new Error('Insufficient coins');

    await firestore.runTransaction(async (transaction) => {
      transaction.update(userRef, {
        coinBalance: FieldValue.increment(-cost),
        streakFreezeAvailable: FieldValue.increment(1)
      });
      const txRef = collections.coinTransactions!.doc();
      transaction.set(txRef, {
        userId,
        amount: -cost,
        type: 'BUY_STREAK_FREEZE',
        description: 'Purchased streak freeze',
        createdAt: Timestamp.now()
      });
    });
  }

  async updateReferralLadder(userId: string): Promise<any> {
    const completedCountRes = await collections.referrals!
      .where('referrerId', '==', userId)
      .where('status', '==', 'completed')
      .get();
    
    const count = completedCountRes.size;
    
    const ladderRef = collections.referralLadders!.doc(userId);
    const ladderDoc = await ladderRef.get();
    const ladderData = ladderDoc.exists ? ladderDoc.data() : { userId, tier: 0, rewardsClaimed: {} };
    
    let newTier = 0;
    if (count >= 100) newTier = 6;
    else if (count >= 50) newTier = 5;
    else if (count >= 25) newTier = 4;
    else if (count >= 10) newTier = 3;
    else if (count >= 5) newTier = 2;
    else if (count >= 1) newTier = 1;

    const TIERS = [
      { count: 1, rmp: 50, coins: 0, badge: 'Rookie Recruiter' },
      { count: 5, rmp: 100, coins: 5, badge: 'Bronze Recruiter' },
      { count: 10, rmp: 250, coins: 10, badge: 'Silver Recruiter' },
      { count: 25, rmp: 500, coins: 25, badge: 'Gold Recruiter' },
      { count: 50, rmp: 1000, coins: 50, badge: 'Platinum Recruiter' },
      { count: 100, rmp: 2000, coins: 100, badge: 'Diamond Recruiter' },
    ];

    if (newTier > (ladderData?.tier || 0)) {
      const claimed = ladderData?.rewardsClaimed || {};
      for (let i = 1; i <= newTier; i++) {
        if (!claimed[i]) {
          const reward = TIERS[i - 1];
          await this.addRMP(userId, reward.rmp, 'REFERRAL_LADDER', `Tier ${i} reached (${reward.count} referrals)`);
          if (reward.coins > 0) {
            await collections.users!.doc(userId).update({
              coinBalance: FieldValue.increment(reward.coins),
              totalCoinsEarned: FieldValue.increment(reward.coins)
            });
          }
          // badge logic? we can add it to user document
          if (reward.badge) {
             await collections.users!.doc(userId).update({
                badges: FieldValue.arrayUnion(reward.badge)
             });
          }
          claimed[i] = true;
        }
      }
      await ladderRef.set({
        userId,
        tier: newTier,
        rewardsClaimed: claimed,
        updatedAt: Timestamp.now()
      }, { merge: true });
    }
    
    return { tier: newTier, count };
  }

  async customizeProfile(userId: string, type: 'frame' | 'bg' | 'title', itemId: string): Promise<void> {
    const COSTS: Record<string, number> = {
      'frame_gold': 100,
      'frame_flame': 200,
      'frame_crown': 500,
      'bg_roast': 150,
      'bg_battle': 300,
      'title_menace': 1000
    };

    const cost = COSTS[`${type}_${itemId}`] || 0;
    const userRef = collections.users!.doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) throw new Error('User not found');
    const userData = userDoc.data()!;
    if (cost > 0 && (userData.coinBalance || 0) < cost) {
      throw new Error('Insufficient coins');
    }

    await firestore.runTransaction(async (transaction) => {
      if (cost > 0) {
        transaction.update(userRef, {
          coinBalance: FieldValue.increment(-cost)
        });
        const txRef = collections.coinTransactions!.doc();
        transaction.set(txRef, {
          userId,
          amount: -cost,
          type: 'PROFILE_CUSTOMIZATION',
          description: `Bought ${type}: ${itemId}`,
          createdAt: Timestamp.now()
        });
      }

      const updateData: any = {};
      if (type === 'frame') updateData.avatarFrame = itemId;
      else if (type === 'bg') updateData.profileBg = itemId;
      else if (type === 'title') updateData.roastTitle = itemId;

      transaction.update(userRef, updateData);
    });
  }
}

export const economyService = EconomyService.getInstance();
