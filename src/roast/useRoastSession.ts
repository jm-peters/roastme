import { useState, useEffect, useCallback } from "react";
import { 
  subscribeToRoastHistory, 
  getRoastProfile, 
  getRoastStreak, 
  saveRoastSession,
  getDailyRoast
} from "./roastFirestore";
import { deliverRoast } from "./roastEngine";

export function useRoastSession(userId: string | undefined) {
  const [history, setHistory] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [streak, setStreak] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const unsubHistory = subscribeToRoastHistory(userId, (data) => {
      setHistory(data);
    });

    const init = async () => {
      const [p, s] = await Promise.all([
        getRoastProfile(userId),
        getRoastStreak(userId)
      ]);
      setProfile(p);
      setStreak(s);
      setLoading(false);
    };

    init();
    return () => unsubHistory();
  }, [userId]);

  const generateNewRoast = useCallback(async (params: any) => {
    if (!userId) return null;
    const res = deliverRoast({
      ...params,
      profile: {
        jobTitle: profile?.jobTitle,
        hobby: profile?.hobbies?.[0],
        habit: profile?.biggestHabit,
        streak: streak?.currentStreak || 1
      },
      seen: history.map(h => h.templateId)
    });

    const sessionId = await saveRoastSession(userId, res);
    return { ...res, id: sessionId };
  }, [userId, profile, streak, history]);

  return {
    history,
    profile,
    streak,
    loading,
    generateNewRoast
  };
}

export function useDailyRoast(userId: string | undefined) {
  const [daily, setDaily] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const fetchDaily = async () => {
      const res = await getDailyRoast(userId);
      setDaily(res);
      setLoading(false);
    };
    fetchDaily();
  }, [userId]);

  return { daily, loading };
}
