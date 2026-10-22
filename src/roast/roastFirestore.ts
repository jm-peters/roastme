import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  increment,
  Timestamp
} from "firebase/firestore";
import { db } from "../firebase";

// --- PROFILE ---
export async function getRoastProfile(userId: string) {
  const snap = await getDoc(doc(db, 'roastProfiles', userId));
  return snap.exists() ? snap.data() : null;
}

export async function saveRoastProfile(userId: string, profile: any) {
  await setDoc(doc(db, 'roastProfiles', userId), {
    ...profile,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

// --- SESSIONS ---
export async function saveRoastSession(userId: string, roastData: any) {
  const sessionRef = doc(collection(db, 'roastSessions'));
  await setDoc(sessionRef, {
    ...roastData,
    userId,
    createdAt: serverTimestamp(),
    saved: false,
    shared: false,
    userRating: null,
    ratingCount: 0
  });
  return sessionRef.id;
}

export async function updateRoastSession(sessionId: string, data: any) {
  await updateDoc(doc(db, 'roastSessions', sessionId), data);
}

export function subscribeToRoastHistory(userId: string, callback: (sessions: any[]) => void) {
  const q = query(
    collection(db, 'roastSessions'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// --- STREAKS ---
export async function getRoastStreak(userId: string) {
  const snap = await getDoc(doc(db, 'roastStreaks', userId));
  return snap.exists() ? snap.data() : { currentStreak: 1, longestStreak: 1, totalRoasts: 0, badges: [] };
}

// --- DAILY ROASTS ---
export async function getDailyRoast(userId: string) {
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const id = `${userId}_${today}`;
  const snap = await getDoc(doc(db, 'dailyRoasts', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// --- BATTLES ---
export async function createRoastBattle(challengerId: string, topic: string, opponentName: string) {
  const battleRef = doc(collection(db, 'roastBattles'));
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  await setDoc(battleRef, {
    challengerId,
    topic,
    opponentName,
    status: 'pending',
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
    votesForChallenger: 0,
    votesForOpponent: 0
  });
  return battleRef.id;
}

export function subscribeToBattle(battleId: string, callback: (battle: any) => void) {
  return onSnapshot(doc(db, 'roastBattles', battleId), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
  });
}
