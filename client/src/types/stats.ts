export interface BestResult {
  id: string;
  date: string;
  durationMinutes: number;
}

export interface WeekData {
  labels: string[];
  minutes: number[];
}

export interface OverviewStats {
  todayMinutes: number;
  activeDays: number;
  bestDayMinutes: number;
  currentStreak: number;
}