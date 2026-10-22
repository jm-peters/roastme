import admin from "firebase-admin";
import { getFirestore, initializeFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

// Initialization logic
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
let targetProjectId = "";
let targetDbId = "";

if (fs.existsSync(firebaseConfigPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
    targetProjectId = config.projectId;
    targetDbId = config.firestoreDatabaseId && config.firestoreDatabaseId !== "(default)"
      ? config.firestoreDatabaseId
      : "";
    
    // Always override to ensure we target the project defined in config
    if (targetProjectId) {
       process.env.GOOGLE_CLOUD_PROJECT = targetProjectId;
       process.env.GCLOUD_PROJECT = targetProjectId;
       console.log(`[Firebase Admin] Pre-initialized with project: ${targetProjectId}`);
    }
  } catch (e) {}
}

let authObj: admin.auth.Auth | null = null;
let dbObj: admin.firestore.Firestore | null = null;

let firebaseAdminHealthStatus: { healthy: boolean; error?: string } = { healthy: false, error: "Not initialized" };
export const getFirebaseHealth = () => firebaseAdminHealthStatus;

if (targetProjectId) {
  try {
    let app: admin.app.App;
    
    // Determine credentials
    let credential = admin.credential.applicationDefault();
    
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        credential = admin.credential.cert(sa);
        console.log(`[Firebase Admin] Using credentials from FIREBASE_SERVICE_ACCOUNT_KEY`);
      } catch (e) {
        console.error(`[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY`, e);
      }
    } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      credential = admin.credential.cert({
        projectId: targetProjectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
      console.log(`[Firebase Admin] Using credentials from private key env vars`);
    }

    if (admin.apps.length > 0) {
      app = admin.apps[0]!;
      // If project mismatch, delete and re-init
      if (app.options.projectId !== targetProjectId) {
        console.warn(`[Firebase Admin] Project ID mismatch. Re-initializing...`);
        admin.apps.forEach(a => a.delete());
        app = admin.initializeApp({
          projectId: targetProjectId,
          credential
        });
      }
    } else {
      app = admin.initializeApp({
        projectId: targetProjectId,
        credential
      });
      console.log(`[Firebase Admin] Initialized with projectId: ${targetProjectId}`);
    }
    
    authObj = admin.auth(app);
    
    const databaseId = targetDbId || undefined;

    if (databaseId) {
      dbObj = initializeFirestore(app, { preferRest: true }, databaseId);
    } else {
      dbObj = initializeFirestore(app, { preferRest: true });
    }
    console.log(`[Firebase Admin] Firestore ready (REST). Targeting DB: ${databaseId || '(default)'}`);
    
    // Test Firestore connectivity immediately to catch permission issues early
    (async () => {
      try {
        await dbObj!.collection('_health_check').limit(1).get();
        console.log(`[Firebase Admin] Firestore connectivity test PASSED`);
        firebaseAdminHealthStatus = { healthy: true };
      } catch (e: any) {
        console.error(`[Firebase Admin] Firestore connectivity test FAILED: ${e.message}`);
        firebaseAdminHealthStatus = { healthy: false, error: e.message };
        if (e.message.includes('permission') || e.message.includes('403') || e.message.includes('insufficient')) {
          const currentIdentity = "ais-sandbox@ais-europe-west2-e943b1b20c7f4.iam.gserviceaccount.com";
          console.error(`\n[CRITICAL PERMISSION ERROR]`);
          console.error(`The backend identity (${currentIdentity}) lacks permission to project ${targetProjectId}.`);
          console.error(`To fix this:`);
          console.error(`1. Go to Firebase Console > Project Settings > Service Accounts`);
          console.error(`2. Click 'Generate new private key' and copy the JSON`);
          console.error(`3. Add any environment variable 'FIREBASE_SERVICE_ACCOUNT_KEY' with the JSON content in AI Studio Settings.`);
          console.error(`OR: Grant 'Cloud Datastore User' role to '${currentIdentity}' in Google Cloud Console IAM for project ${targetProjectId}.\n`);
        }
      }
    })();
  } catch (error: any) {
    console.error("[Firebase Admin] Critical Initialization failed:", error.message || error);
    firebaseAdminHealthStatus = { healthy: false, error: error.message };
  }
}

export const auth = authObj!;
export const firestore = dbObj!;
export const db = dbObj!;
export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;

// Firestore collection references
export const collections = {
  users: dbObj?.collection('users'),
  roasts: dbObj?.collection('roasts'),
  rmpTransactions: dbObj?.collection('rmpTransactions'),
  coinTransactions: dbObj?.collection('coinTransactions'),
  referrals: dbObj?.collection('referrals'),
  challenges: dbObj?.collection('challenges'),
  challengeRooms: dbObj?.collection('challengeRooms'),
  matchmakingQueue: dbObj?.collection('matchmakingQueue'),
  roastProfiles: dbObj?.collection('roastProfiles'),
  roastSessions: dbObj?.collection('roastSessions'),
  roastStreaks: dbObj?.collection('roastStreaks'),
  roastBattles: dbObj?.collection('roastBattles'),
  dailyRoasts: dbObj?.collection('dailyRoasts'),
  games: dbObj?.collection('games'),
  dailyStats: dbObj?.collection('dailyStats'),
  withdrawals: dbObj?.collection('withdrawals'),
  spinHistory: dbObj?.collection('spinHistory'),
  referralLadders: dbObj?.collection('referralLadders'),
};

export const getAdminAuth = () => {
  if (!authObj) throw new Error("Firebase Admin Auth not initialized");
  return authObj;
};

export const getAdminDb = () => {
  if (!dbObj) throw new Error("Firebase Admin Firestore not initialized");
  return dbObj;
};

export { admin };
