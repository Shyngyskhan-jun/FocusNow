import { useState, useEffect, useCallback, useRef } from 'react';
import * as tasksService from '../services/tasks';
import { logBehavior } from '../services/metrics';
import type { Task, Priority, Mood } from '../types/task';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const tasksRef = useRef<Task[]>([]);
  const errorTimer = useRef<number | null>(null);

  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  const showError = useCallback((msg: string) => {
    setErrorMessage(msg);
    if (errorTimer.current) window.clearTimeout(errorTimer.current);
    errorTimer.current = window.setTimeout(() => setErrorMessage(null), 4000);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await tasksService.fetchTasks();
        if (alive) setTasks(data);
      } catch {
        if (alive) showError('Не удалось загрузить задачи');
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [showError]);

  const addTask = useCallback(async (
    text: string, priority: Priority,
    deadline: string | null, mood: Mood | null
  ) => {
    try {
      const task = await tasksService.createTask({ text, priority, deadline, mood_before: mood });
      setTasks(prev => [task, ...prev]);
      return true;
    } catch {
      showError('Не удалось добавить задачу');
      return false;
    }
  }, [showError]);

  const toggleTask = useCallback(async (id: string | number) => {
    const cur = tasksRef.current.find(t => t.id === id);
    if (!cur) return;
    const next = !cur.completed;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: next } : t));
    try {
      await tasksService.updateTask(id, { completed: next });
    } catch {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: cur.completed } : t));
      showError('Не удалось обновить задачу');
    }
  }, [showError]);

  const deleteTask = useCallback(async (id: string | number) => {
    const snapshot = tasksRef.current;
    const target = snapshot.find(t => t.id === id);
    const idx = snapshot.findIndex(t => t.id === id);
    if (!target) return;
    setTasks(p => p.filter(t => t.id !== id));
    try {
      await tasksService.deleteTask(id);
    } catch {
      setTasks(p => {
        if (p.some(t => t.id === id)) return p;
        const next = [...p];
        next.splice(idx >= 0 ? idx : next.length, 0, target);
        return next;
      });
      showError('Не удалось удалить задачу');
    }
  }, [showError]);

  const toggleStep = useCallback(async (taskId: string | number, stepId: string | number) => {
    setTasks(prev => prev.map(t => t.id !== taskId ? t : {
      ...t,
      steps: (t.steps ?? []).map(s => s.id === stepId ? { ...s, done: !s.done } : s),
    }));
    try {
      await tasksService.toggleStep(taskId, stepId);
    } catch { /* optimistic only */ }
  }, []);

  const addStep = useCallback(async (taskId: string | number, text: string) => {
    try {
      const step = await tasksService.addStep(taskId, text);
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, steps: [...(t.steps ?? []), step] } : t
      ));
    } catch {
      showError('Не удалось добавить шаг');
    }
  }, [showError]);

  const delayTask = useCallback((id: string | number) => {
    logBehavior('delay', id);
  }, []);

  return { tasks, isLoading, errorMessage, addTask, toggleTask, deleteTask, toggleStep, addStep, delayTask };
}