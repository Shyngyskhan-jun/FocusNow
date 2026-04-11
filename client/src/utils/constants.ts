export const DAILY_GOAL_MINUTES = 120;
export const DEFAULT_FOCUS_MINUTES = 25;
export const MIN_FOCUS_MINUTES = 5;
export const MAX_FOCUS_MINUTES = 120;
export const FOCUS_STEP = 5;

export const DEFAULT_BLOCKED_SITES = [
  'facebook.com',
  'instagram.com',
  'tiktok.com',
  'vk.com',
];

export const PRIORITY_WEIGHT = {
  high: 3,
  medium: 2,
  low: 1,
} as const;

export const MOOD_OPTIONS = [
  { value: 'tired',     emoji: '😴', label: 'Устал',     hint: 'Мало энергии' },
  { value: 'normal',    emoji: '😐', label: 'Нормально', hint: 'Можно работать' },
  { value: 'energized', emoji: '⚡', label: 'Энергично', hint: 'Полный заряд' },
] as const;