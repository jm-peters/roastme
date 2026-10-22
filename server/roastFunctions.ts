import admin from "firebase-admin";
import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "AQ.Ab8RN6KCopmsqXal-ugQ5RRhNYvepNfig_wbvCLynyacrc5F_A" });

/**
 * server/roastFunctions.ts
 * Logic for daily crons and background tasks
 */

/**
 * 1. Daily Roast Generator
 * Fires for every user to prepare their horoscope-style roast
 */
export async function generateDailyRoasts() {
  const db = admin.firestore();
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const usersSnap = await db.collection('roastProfiles').get();
  
  if (usersSnap.empty) return 0;

  let count = 0;
  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id;
    const dailyId = `${userId}_${today}`;
    
    // Check if already exists
    const dailyRef = db.collection('dailyRoasts').doc(dailyId);
    const existing = await dailyRef.get();
    if (existing.exists) continue;

    const profile = userDoc.data();
    
    const prompt = `
      You are a professional roast engine. 
      Generate a "Daily Horoscope" style roast for this user.
      User Profile: ${JSON.stringify(profile)}
      Today is: ${new Date().toDateString()}

      Keep it short (under 200 chars), witty, and devastating.
      Do not include "Here is your roast" or similar phrases.
    `;

    let roastText = "Your existence is a bug, not a feature.";
    try {
      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });
      roastText = response.text?.trim() || roastText;
    } catch (e) {
      console.error("Daily Roast AI Error:", e);
    }
    
    await dailyRef.set({
      userId,
      date: today,
      roastText,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      viewed: false
    });
    count++;
  }
  return count;
}

/**
 * 2. Battle Expiry & Resolution
 * Closes fights every hour and declares winners
 */
export async function processExpiredBattles() {
  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();

  const expiredSnap = await db
    .collection('roastBattles')
    .where('status', 'in', ['active', 'voting', 'pending'])
    .where('expiresAt', '<=', now)
    .get();

  if (expiredSnap.empty) return 0;

  const batch = db.batch();
  expiredSnap.docs.forEach(doc => {
    const data = doc.data();
    const winner = (data.votesForChallenger || 0) > (data.votesForOpponent || 0)
      ? data.challengerId
      : (data.votesForOpponent || 0) > (data.votesForChallenger || 0)
        ? data.opponentId
        : 'tie';

    batch.update(doc.ref, {
      status: 'complete',
      winner: winner,
      closedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  await batch.commit();
  return expiredSnap.size;
}

/**
 * 3. Weekly Report Generator
 * Aggregates stats every Sunday
 */
export async function generateWeeklyReport(userId: string, weekKey: string) {
  const db = admin.firestore();
  
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const sessionsSnap = await db.collection('roastSessions')
    .where('userId', '==', userId)
    .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(weekAgo))
    .get();

  if (sessionsSnap.empty) return null;

  const sessions = sessionsSnap.docs.map(d => d.data());
  
  const intensities: Record<string, number> = {};
  sessions.forEach(s => {
    intensities[s.intensity] = (intensities[s.intensity] || 0) + 1;
  });

  const reportData = {
    userId,
    weekKey,
    totalRoasts: sessions.length,
    totalComebacks: sessions.filter(s => s.hasComeback).length,
    avgRating: 4.2, // Placeholder
    intensities,
    viewed: false,
    generatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.collection('weeklyReports').doc(userId).set(reportData);
  return reportData;
}

/**
 * 4. Callable: Get Weekly Report
 */
export async function getReportForUser(userId: string) {
  const db = admin.firestore();
  const snap = await db.collection('weeklyReports').doc(userId).get();
  return snap.exists ? snap.data() : null;
}

/**
 * 5. Battle Status Trigger
 * Advances battle status when both roasts are submitted
 */
export async function onBattleRoastSubmitted(battleId: string) {
  const db = admin.firestore();
  const battleRef = db.collection('roastBattles').doc(battleId);
  const snap = await battleRef.get();
  
  if (!snap.exists) return;
  const data = snap.data();
  
  if (data.challengerRoast && data.opponentRoast && data.status === 'pending') {
    await battleRef.update({
      status: 'active',
      activeAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000))
    });
  }
}
