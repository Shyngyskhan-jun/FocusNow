export type Priority = 'high' | 'medium' | 'low';
export type Mood = 'tired' | 'normal' | 'energized';
export type FilterTab = 'all' | 'active' | 'completed' | 'overdue';

export interface SubStep {
  id: string | number;
  text: string;
  done: boolean;
}

export interface Task {
  id: string | number;
  text: string;
  priority: Priority;
  completed: boolean;
  deadline?: string | null;
  mood_before?: Mood | null;
  steps?: SubStep[];
  updated_at?: string | null;
  created_at?: string | null;
}