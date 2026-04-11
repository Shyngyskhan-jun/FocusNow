export const STORAGE_KEYS = {
  TOKEN: 'focusnow_token',
  USER_NAME: 'focusnow_user_name',
  THEME: 'focusnow_theme',
  FOCUS_MINUTES: 'focusnow_focus_minutes',
  FOCUS_MOOD: 'focusnow_focus_mood',
  TIMER_END: 'focusnow_timer_end',
  TIMER_RUNNING: 'focusnow_timer_running',
  BLOCKED_SITES: 'focusnow_blocked_sites',
  SETTINGS_DAY_REMINDER: 'settings_dayReminder',
  SETTINGS_POMODORO_NOTIFY: 'settings_pomodoroNotify',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];