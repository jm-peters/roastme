// src/services/roastFirestore.ts
import { db } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit, 
  getDocs,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

export async function saveRoastSession(data: any) {
  const sessionId = Math.random().toString(36).substring(2, 15);
  const docRef = doc(db, 'roastSessions', sessionId);
  await setDoc(docRef, {
    ...data,
    createdAt: serverTimestamp(),
    saved: false,
    shared: false,
    userRating: null,
    comebackText: null,
    aiComebackJudgment: null
  });
  return sessionId;
}

export async function updateRoastSession(sessionId: string, data: any) {
  const docRef = doc(db, 'roastSessions', sessionId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function getRoastProfile(userId: string) {
  const docRef = doc(db, 'roastProfiles', userId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
}

export async function updateRoastProfile(userId: string, data: any) {
  const docRef = doc(db, 'roastProfiles', userId);
  await setDoc(docRef, {
    ...data,
    userId,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function getRoastHistory(userId: string, limitCount: number = 20) {
  const q = query(
    collection(db, 'roastSessions'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    firestoreLimit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
