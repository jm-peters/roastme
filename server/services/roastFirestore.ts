// server/services/roastFirestore.ts
import { db } from '../lib/firebase-admin.ts';
import admin from 'firebase-admin';

export async function saveRoastSession(data: any) {
  const sessionId = Math.random().toString(36).substring(2, 15);
  try {
    const docRef = db.collection('roastSessions').doc(sessionId);
    await docRef.set({
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      saved: false,
      shared: false,
      userRating: null,
      comebackText: null,
      aiComebackJudgment: null
    });
  } catch (err) {
    console.warn("[Firestore] saveRoastSession offline/error fallback:", err);
  }
  return sessionId;
}

export async function updateRoastSession(sessionId: string, data: any) {
  try {
    const docRef = db.collection('roastSessions').doc(sessionId);
    await docRef.update({
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    console.warn("[Firestore] updateRoastSession offline/error fallback:", err);
  }
}

export async function getRoastProfile(userId: string) {
  try {
    const docRef = db.collection('roastProfiles').doc(userId);
    const docSnap = await docRef.get();
    return docSnap.exists ? docSnap.data() : null;
  } catch (err) {
    console.warn("[Firestore] getRoastProfile offline/error fallback:", err);
    return null;
  }
}

export async function updateRoastProfile(userId: string, data: any) {
  try {
    const docRef = db.collection('roastProfiles').doc(userId);
    await docRef.set({
      ...data,
      userId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn("[Firestore] updateRoastProfile offline/error fallback:", err);
  }
}

export async function getRoastHistory(userId: string, limitCount: number = 20) {
  try {
    const q = db.collection('roastSessions')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limitCount);
    const snap = await q.get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.warn("[Firestore] getRoastHistory offline/error fallback:", err);
    return [];
  }
}
