export const THEMES = {
  week1: { name: 'Office Roast', icon: '💼', style: 'office', multiplier: 1.0 },
  week2: { name: 'Rap Battle', icon: '🎤', style: 'rap', multiplier: 1.1 },
  week3: { name: 'Shakespeare', icon: '🎭', style: 'shakespeare', multiplier: 1.1 },
  week4: { name: 'Twitter Mode', icon: '🐦', style: 'twitter', multiplier: 1.0 },
  week5: { name: 'Gaming Roast', icon: '🎮', style: 'gaming', multiplier: 1.2 },
  week6: { name: 'Fashion Police', icon: '👔', style: 'fashion', multiplier: 1.0 },
  week7: { name: 'Brain Battle', icon: '🧠', style: 'intellectual', multiplier: 1.1 },
  week8: { name: 'Social Media', icon: '📱', style: 'social', multiplier: 1.0 },
  week9: { name: 'Career Roast', icon: '💼', style: 'career', multiplier: 1.1 },
  week10: { name: 'Tall Energy', icon: '📏', style: 'tallness', multiplier: 1.0 },
  week11: { name: 'Short King', icon: '👑', style: 'shortness', multiplier: 1.0 },
  week12: { name: 'Gaming Tryhard', icon: '🎮', style: 'gaming', multiplier: 1.2 },
};

export function getCurrentTheme(): { name: string; icon: string; style: string; multiplier: number; daysLeft: number } {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const weekNumber = Math.ceil((((now.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getDay() + 1) / 7);
  const themeKey = `week${((weekNumber - 1) % 12) + 1}` as keyof typeof THEMES;
  const theme = THEMES[themeKey as keyof typeof THEMES] || THEMES.week1;
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
  const daysLeft = Math.max(1, Math.ceil((endOfWeek.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  return { ...theme, daysLeft };
}

export function getIntensityForUser(totalRoasts: number, battleWinRate: number): 'mild' | 'medium' | 'brutal' {
  if (totalRoasts < 10) return 'mild';
  if (totalRoasts < 50 || battleWinRate < 0.4) return 'medium';
  return 'brutal';
}

export function getLanguageComplexityForUser(daysActive: number, totalInteractions: number): 'simple' | 'standard' | 'complex' {
  if (daysActive < 7 || totalInteractions < 20) return 'simple';
  if (daysActive < 30 || totalInteractions < 100) return 'standard';
  return 'complex';
}

export function getSalvageModeForUser(reportedOffensive: number, hasExtremeContent: boolean): 'none' | 'light' | 'heavy' {
  if (reportedOffensive > 0) return 'heavy';
  if (hasExtremeContent) return 'light';
  return 'none';
}

export function getRoastStyleForUser(challengeCompletionRate: number): 'comeback' | 'challenge' | 'self_deprecating' | 'existential' {
  if (challengeCompletionRate > 0.7) return 'challenge';
  if (challengeCompletionRate > 0.4) return 'comeback';
  if (challengeCompletionRate > 0.2) return 'self_deprecating';
  return 'existential';
}

export function getAutomatedSettingsForUser(user: any, roastHistoryTexts: string[], challengesCompleted: number, totalChallenges: number, reportedOffensive: number) {
    const theme = getCurrentTheme();
    if (!user) {
        return {
          theme: theme.style,
          themeName: theme.name,
          themeIcon: theme.icon,
          intensity: 'mild' as 'mild' | 'medium' | 'brutal',
          languageComplexity: 'simple' as 'simple' | 'standard' | 'complex',
          salvageMode: 'light' as 'none' | 'light' | 'heavy',
          roastStyle: 'comeback' as 'comeback' | 'challenge' | 'self_deprecating' | 'existential',
          comboMultiplier: 1.0,
          userStats: null
        };
    }

    const createdAt = user.createdAt ? new Date(user.createdAt).getTime() : Date.now();
    const daysActive = Math.ceil((Date.now() - createdAt) / (1000 * 60 * 60 * 24));
    
    const totalRoasts = user.totalRoasts || 0;
    const battleWins = user.battleWins || 0;
    const battleLosses = user.battleLosses || 0;
    const totalBattles = battleWins + battleLosses;
    const battleWinRate = totalBattles > 0 ? battleWins / totalBattles : 0;
    const totalInteractions = totalRoasts + totalBattles;

    const challengeCompletionRate = totalChallenges > 0 ? challengesCompleted / totalChallenges : 0;
    
    const hasExtremeContent = roastHistoryTexts.some(roast => 
      roast.includes('💀💀💀') || roast.includes('🔪') || roast.includes('murder')
    );

    return {
        theme: theme.style,
        themeName: theme.name,
        themeIcon: theme.icon,
        intensity: getIntensityForUser(totalRoasts, battleWinRate) as 'mild' | 'medium' | 'brutal',
        languageComplexity: getLanguageComplexityForUser(daysActive, totalInteractions) as 'simple' | 'standard' | 'complex',
        salvageMode: getSalvageModeForUser(reportedOffensive, hasExtremeContent) as 'none' | 'light' | 'heavy',
        roastStyle: getRoastStyleForUser(challengeCompletionRate) as 'comeback' | 'challenge' | 'self_deprecating' | 'existential',
        comboMultiplier: 1.0, 
        userStats: {
            totalRoasts: totalRoasts,
            battleWinRate: Math.round(battleWinRate * 100),
            daysActive: daysActive
        }
    }
}
