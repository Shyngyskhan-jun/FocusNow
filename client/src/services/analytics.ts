import { apiFetch } from './api';

export interface AnalyticsData {
  productivityByHour: { hour: number; score: number }[];
  moodVsCompletion: { mood: string; completionRate: number }[];
  procrastinationPeaks: { hour: number; count: number }[];
  totalFocusMinutes: number;
  totalTasksCompleted: number;
  totalTasksOverdue: number;
}

export async function fetchAnalytics(): Promise<AnalyticsData> {
  return apiFetch<AnalyticsData>('/analytics');
}