import { getAdminDb } from '../lib/firebase-admin.ts';

export async function syncToFirestore(collectionPath: string, docId: string, data: any) {
  try {
    const db = getAdminDb();
    if (db) {
      await db.collection(collectionPath).doc(docId).set(data, { merge: true });
    }
  } catch (error) {
    console.error(`Error syncing to Firestore [${collectionPath}/${docId}]:`, error);
  }
}

export async function getFromFirestore(collectionPath: string, docId: string) {
  try {
    const db = getAdminDb();
    if (db) {
      const doc = await db.collection(collectionPath).doc(docId).get();
      return doc.exists ? doc.data() : null;
    }
  } catch (error) {
    console.error(`Error getting from Firestore [${collectionPath}/${docId}]:`, error);
  }
  return null;
}
