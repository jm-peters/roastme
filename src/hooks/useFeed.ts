// src/hooks/useFeed.ts - FEED STATE & INTERACTIONS
import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  doc, 
  updateDoc, 
  increment, 
  deleteDoc 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export interface FeedItemData {
  id: string;
  text: string;
  photoUrl?: string;
  userId: string;
  username?: string;
  intensity: string;
  roastType: string;
  createdAt: string;
  reactions: Record<string, number>;
  remixCount: number;
  isTrending?: boolean;
}

export function useFeed(filter: 'trending' | 'new' | 'savage' = 'trending') {
  const [items, setItems] = useState<FeedItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    let q;
    
    if (filter === 'trending') {
      // Fetch from the pre-generated trending collection
      q = query(
        collection(db, 'trending_roasts'),
        orderBy('viewCount', 'desc'),
        limit(20)
      );
    } else if (filter === 'savage') {
      q = query(
        collection(db, 'roasts'),
        where('isPublic', '==', true),
        where('intensity', '==', 'savage'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    } else {
      q = query(
        collection(db, 'roasts'),
        where('isPublic', '==', true),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const feedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FeedItemData[];
      setItems(feedItems);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'roasts');
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [filter]);

  const reactToRoast = async (roastId: string, type: string) => {
    try {
      const roastRef = doc(db, 'roasts', roastId);
      await updateDoc(roastRef, {
        [`reactions.${type}`]: increment(1)
      });
    } catch (err) {
      console.error('Reaction error:', err);
    }
  };

  const deleteRoast = async (roastId: string) => {
    try {
      await deleteDoc(doc(db, 'roasts', roastId));
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return { items, loading, error, reactToRoast, deleteRoast, refresh: () => {} };
}
