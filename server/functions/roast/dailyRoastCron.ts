// /src/functions/roast/dailyRoastCron.ts
// This is a simulated cloud function entry

import admin from 'firebase-admin';
import { buildDailyRoastPrompt } from '../../services/roastAI.ts';
import { callClaudeAPI } from '../../services/claudeClient.ts';

export async function generateDailyRoasts() {
  // Normally this would be a CRON job
  console.log("Generating daily roasts...");
  const db = admin.firestore();
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');

  const profilesSnap = await db.collection('roastProfiles').get();
  const batch = db.batch();
  const promises = [];

  for (const doc of profilesSnap.docs) {
    const userId = doc.id;
    const userProfile = doc.data();
    const docId = `${userId}_${today}`;

    const existingRef = db.collection('dailyRoasts').doc(docId);
    const existing = await existingRef.get();
    if (existing.exists) continue;

    const promise = (async () => {
      try {
        const { systemPrompt, userPrompt } = buildDailyRoastPrompt({
          userProfile,
          date: new Date().toISOString(),
          dayOfWeek: new Date().getDay()
        });

        const roastText = await callClaudeAPI({ systemPrompt, userPrompt });

        batch.set(existingRef, {
          userId,
          date: today,
          roastText,
          deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
          opened: false,
          rating: null
        });
      } catch (err) {
        console.error(`Failed daily roast for ${userId}:`, err);
      }
    })();

    promises.push(promise);
  }

  await Promise.all(promises);
  await batch.commit();

  console.log(`Daily roasts generated for ${profilesSnap.size} users`);
}
