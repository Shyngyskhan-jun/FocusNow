import { useState, useEffect, useMemo } from 'react';
import { fetchFocusStats } from '../services/focus';
import { getDateKey, isSameDay } from '../utils/formatDate';

interface DailyStat { date: Date; minutes: number; }

export function useStatistics() {
  const [daily, setDaily] = useState<DailyStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await fetchFocusStats();
        const parsed = (data.dailyStats ?? []).map(d => ({
          date: new Date(d.date),
          minutes: Number(d.total_minutes) || 0,
        }));
        if (alive) setDaily(parsed);
      } catch {
        // тихо
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const dailyMap = useMemo(() => {
    const map = new Map<string, number>();
    daily.forEach(d => map.set(getDateKey(d.date), d.minutes));
    return map;
  }, [daily]);

  const currentStreak = useMemo(() => {
    let streak = 0;
    const date = new Date();
    if (!dailyMap.get(getDateKey(date))) date.setDate(date.getDate() - 1);
    while (dailyMap.get(getDateKey(date))) {
      streak++;
      date.setDate(date.getDate() - 1);
    }
    return streak;
  }, [dailyMap]);

  const todayMinutes = dailyMap.get(getDateKey(new Date())) ?? 0;
  const activeDays = daily.filter(d => d.minutes > 0).length;
  const bestDay = daily.length > 0 ? Math.max(...daily.map(d => d.minutes)) : 0;

  return { daily, dailyMap, isLoading, currentStreak, todayMinutes, activeDays, bestDay };
}