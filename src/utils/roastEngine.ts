export function scoreRoast(roast: string, intensity: string): { savageness: number; creativity: number; overall: number } {
  let savageness = 5;
  let creativity = 5;
  
  if (roast.includes('💀')) savageness += 1;
  if (roast.includes('🔪')) savageness += 1;
  if (roast.match(/[A-Z]{5,}/)) savageness += 1;
  if (roast.includes('ratio')) savageness += 1;
  if (roast.length > 150) savageness += 1;
  
  if (roast.includes('like')) creativity += 1;
  if (roast.match(/[a-z]{10,}/)) creativity += 1;
  if (roast.includes('--')) creativity += 1;
  
  if (intensity === 'brutal') savageness += 2;
  if (intensity === 'medium') savageness += 1;
  
  savageness = Math.min(10, savageness);
  creativity = Math.min(10, creativity);
  const overall = Math.round((savageness + creativity) / 2);
  
  return { savageness, creativity, overall };
}

export function getUserRoastTierFromStats(totalRoasts: number, totalBattlesWon: number): { tier: string; progress: number; nextTier: string } {
  let newTier = 'bronze';
  let progress = 0;
  
  if (totalRoasts >= 500 || totalBattlesWon >= 100) {
    newTier = 'diamond';
    progress = Math.min(100, Math.floor(((totalRoasts - 500) / 500) * 100));
  } else if (totalRoasts >= 200 || totalBattlesWon >= 50) {
    newTier = 'platinum';
    progress = Math.min(100, Math.floor(((totalRoasts - 200) / 300) * 100));
  } else if (totalRoasts >= 100 || totalBattlesWon >= 25) {
    newTier = 'gold';
    progress = Math.min(100, Math.floor(((totalRoasts - 100) / 100) * 100));
  } else if (totalRoasts >= 50 || totalBattlesWon >= 10) {
    newTier = 'silver';
    progress = Math.min(100, Math.floor(((totalRoasts - 50) / 50) * 100));
  } else {
    progress = Math.min(100, Math.floor((totalRoasts / 50) * 100));
  }

  const tiers = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
  const currentIndex = tiers.indexOf(newTier);
  const nextTier = tiers[currentIndex + 1] || 'diamond';

  return { tier: newTier, progress, nextTier };
}
