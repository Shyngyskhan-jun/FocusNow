export type Occupation = 'student' | 'pupil' | 'worker' | 'freelancer' | 'other';
export type DailyGoalOption = 60 | 90 | 120 | 180 | 240;

export interface User {
  id: string;
  name: string;
  email: string;
  joinedDate: string;
  occupation?: Occupation;
  bio?: string;
  dailyGoalMinutes?: DailyGoalOption;
}

export interface UserStats {
  totalFocusMinutes: number;
  longestStreak: number;
  currentStreak: number;
  tasksCompleted: number;
  tasksTotal: number;
}

export type UserProfile = User & UserStats;