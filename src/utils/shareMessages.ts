// src/utils/shareMessages.ts

interface ShareMessageConfig {
  roastText: string;
  roastId: string;
  platform: 'whatsapp' | 'twitter' | 'instagram' | 'tiktok' | 'facebook' | 'telegram';
  includeDeathThreat?: boolean;
  intensity?: 'light' | 'medium' | 'brutal';
  customSender?: string;
  customLink?: string;
}

export function generateShareMessage(config: ShareMessageConfig & { username?: string }): string {
  // Get current user's username from session/localStorage
  const username = localStorage.getItem('username') || config.username || 'roaster';
  const sender = config.customSender || `@${username}`;
  
  // SINGLE LINK - short and clean
  const shortLink = config.customLink || `${window.location.origin}/roast/${username}`;
  
  const challengeText = config.includeDeathThreat 
    ? `ROAST ME BACK OR DIE LIKE A LOSER 💀`
    : `Think you can handle the heat? Roast me back 🔥`;
  
  // Single message with ONE link
  return `🔥 ${sender} just roasted you! 🔥\n\n"${config.roastText}"\n\n${challengeText}\n\n${shortLink}`;
}

// src/utils/shareMessages.ts - CLEAN SHARE MESSAGES WITHOUT DESCRIPTION
export function generateCleanShareMessage(link: string, _context?: string): string {
  // Return only the link for maximum shareability
  return link;
}

export function generateChallengeBadge(text: string, intensity: string): string {
  const badges = {
    light: ["SOFT ROAST", "MILD HEAT", "BABY FLAMES"],
    medium: ["MEDIUM WELL", "SICY ROAST", "BURN NOTICE"],
    brutal: ["EMOTIONAL DAMAGE", "ABSOLUTE VIOLENCE", "FATALITY"]
  };
  
  const category = (badges as any)[intensity] || badges.medium;
  return category[Math.floor(Math.random() * category.length)];
}
