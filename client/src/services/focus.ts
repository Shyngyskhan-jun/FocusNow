import { apiFetch } from './api';
import type { FocusSession, FocusStatsResponse } from '../types/focus';

export async function saveFocusSession(payload: {
  duration_minutes: number;
  mood_before: string;
  completed_at: string;
}): Promise<FocusSession> {
  return apiFetch<FocusSession>('/focus', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchFocusStats(): Promise<FocusStatsResponse> {
  return apiFetch<FocusStatsResponse>('/focus/stats');
}