import { apiFetch } from './api';
import type { Task, Priority, Mood } from '../types/task';

export async function fetchTasks(): Promise<Task[]> {
  return apiFetch<Task[]>('/tasks');
}

export async function createTask(payload: {
  text: string;
  priority: Priority;
  deadline: string | null;
  mood_before: Mood | null;
}): Promise<Task> {
  return apiFetch<Task>('/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateTask(
  id: string | number,
  patch: Partial<Pick<Task, 'completed' | 'text' | 'priority' | 'deadline'>>
): Promise<Task> {
  return apiFetch<Task>(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}

export async function deleteTask(id: string | number): Promise<void> {
  await apiFetch(`/tasks/${id}`, { method: 'DELETE' });
}

export async function addStep(
  taskId: string | number,
  text: string
): Promise<{ id: string; text: string; done: boolean }> {
  return apiFetch(`/tasks/${taskId}/steps`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export async function toggleStep(
  taskId: string | number,
  stepId: string | number
): Promise<void> {
  await apiFetch(`/tasks/${taskId}/steps/${stepId}/toggle`, { method: 'PUT' });
}