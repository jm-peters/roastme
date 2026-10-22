import { db } from '../../firebase';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';

export async function updateStreak(userId: string) {
  const ref = doc(db, 'roastStreaks', userId);
  const snap = await getDoc(ref);
  const today = new Date().toISOString().split('T')[0];

  if (!snap.exists()) {
    await setDoc(ref, {
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: today,
      totalDaysActive: 1,
      milestonesBadges: []
    });
    return { currentStreak: 1, isNewRecord: true };
  }

  const data = snap.data();
  const lastDate = new Date(data.lastActiveDate);
  const todayDate = new Date(today);
  const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { currentStreak: data.currentStreak, isNewRecord: false };
  
  const newStreak = diffDays === 1 ? data.currentStreak + 1 : 1;
  const newLongest = Math.max(newStreak, data.longestStreak);
  const newBadges = [...data.milestonesBadges];

  const milestones: Record<number, string> = {
    3: 'three_day_roast',
    7: 'weekly_roasted',
    14: 'fortnight_of_shame',
    30: 'chronically_roasted',
    100: 'masochist_legend'
  };

  if (milestones[newStreak] && !newBadges.includes(milestones[newStreak])) {
    newBadges.push(milestones[newStreak]);
  }

  await updateDoc(ref, {
    currentStreak: newStreak,
    longestStreak: newLongest,
    lastActiveDate: today,
    totalDaysActive: increment(1),
    milestonesBadges: newBadges
  });

  return { currentStreak: newStreak, isNewRecord: newStreak > data.longestStreak };
}
