import { useState, useCallback } from 'react';
import { auth } from '../../firebase';

export function useRoastEngine(userId: string, userProfile: any) {
  const [currentRoast, setCurrentRoast] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const [generationCount, setGenerationCount] = useState(0);

  const generateRoast = useCallback(async ({
    inputType,
    inputContent,
    persona,
    intensity
  }: any) => {
    setIsGenerating(true);
    setError(null);

    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/roast/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          inputType,
          inputContent,
          persona,
          intensity,
          sessionCount: generationCount
        })
      });

      if (!res.ok) throw new Error('Failed to generate roast');
      
      const data = await res.json();
      const newRoast = {
        sessionId: data.sessionId,
        roastText: data.roastText,
        rewards: data.rewards,
        persona,
        intensity,
        inputType,
        timestamp: new Date()
      };

      setCurrentRoast(newRoast);
      setSessionId(data.sessionId);
      setSessionHistory(prev => [...prev, newRoast]);
      setGenerationCount(prev => prev + 1);

      return newRoast;
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  }, [generationCount]);

  const rateRoast = useCallback(async (rating: string) => {
    if (!sessionId) return;
    try {
      const idToken = await auth.currentUser?.getIdToken();
      await fetch('/api/roast/rate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ sessionId, rating })
      });
      setCurrentRoast((prev: any) => ({ ...prev, userRating: rating }));
    } catch (err) {
      console.error(err);
    }
  }, [sessionId]);

  const saveToTrophyCase = useCallback(async () => {
    if (!sessionId) return;
    try {
      const idToken = await auth.currentUser?.getIdToken();
      await fetch('/api/roast/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ sessionId, saved: true })
      });
      setCurrentRoast((prev: any) => ({ ...prev, saved: true }));
    } catch (err) {
      console.error(err);
    }
  }, [sessionId]);

  return {
    currentRoast,
    isGenerating,
    error,
    sessionHistory,
    generationCount,
    generateRoast,
    rateRoast,
    saveToTrophyCase
  };
}
