import { fetchWithAuth } from "../utils/apiUtils";

// ============================================
// WEEKLY THEME ROTATION - AUTOMATIC
// ============================================
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
  const theme = THEMES[themeKey as keyof typeof THEMES];
  
  // Calculate days left in current week
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
  const daysLeft = Math.ceil((endOfWeek.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    name: theme.name,
    icon: theme.icon,
    style: theme.style,
    multiplier: theme.multiplier,
    daysLeft
  };
}

// These client-side methods are for UI info, server-side calculates actual config based on these ideas
// but the backend handles the roast settings. The front-end just needs to show the UI.
