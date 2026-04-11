import { apiFetch } from './api';

export type BehaviorAction = 'skip' | 'quit' | 'delay';

export async function logBehavior(
  actionType: BehaviorAction,
  taskId?: string | number | null
): Promise<void> {
  try {
    await apiFetch('/behavior', {
      method: 'POST',
      body: JSON.stringify({
        action_type: actionType,
        task_id: taskId ?? null,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    // аналитика не должна ломать UX
  }
}