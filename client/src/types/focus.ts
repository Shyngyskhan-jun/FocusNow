export type MoodValue = 'tired' | 'normal' | 'energized';

export interface FocusSession {
  id: string;
  duration_minutes: number;
  mood_before: MoodValue;
  completed_at: string;
}

export interface DailyStat {
  date: string;
  total_minutes: string | number;
}

export interface FocusStatsResponse {
  dailyStats?: DailyStat[];
}