import { useState, useEffect, useRef, useCallback } from 'react';
import { saveFocusSession } from '../services/focus';
import { logBehavior } from '../services/metrics';
import { storage } from '../services/storage';
import { STORAGE_KEYS } from '../utils/storageKeys';
import { DEFAULT_FOCUS_MINUTES } from '../utils/constants';
import type { MoodValue } from '../types/focus';

export function useFocusTimer() {
  const [focusMinutes, setFocusMinutes] = useState(() =>
    storage.getNumber(STORAGE_KEYS.FOCUS_MINUTES, DEFAULT_FOCUS_MINUTES)
  );
  const [selectedMood, setSelectedMood] = useState<MoodValue>(
    () => (storage.get(STORAGE_KEYS.FOCUS_MOOD) as MoodValue) ?? 'normal'
  );
  const [isRunning, setIsRunning] = useState(() =>
    storage.getBool(STORAGE_KEYS.TIMER_RUNNING, false)
  );
  const [endTime, setEndTime] = useState<number | null>(() => {
    if (!storage.getBool(STORAGE_KEYS.TIMER_RUNNING, false)) return null;
    return storage.getNumber(STORAGE_KEYS.TIMER_END, 0) || null;
  });
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const running = storage.getBool(STORAGE_KEYS.TIMER_RUNNING, false);
    const end = storage.getNumber(STORAGE_KEYS.TIMER_END, 0);
    if (running && end) return Math.max(0, Math.floor((end - Date.now()) / 1000));
    return storage.getNumber(STORAGE_KEYS.FOCUS_MINUTES, DEFAULT_FOCUS_MINUTES) * 60;
  });

  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const intervalRef = useRef<number | null>(null);
  const sessionSavedRef = useRef(false);
  const sessionTime = focusMinutes * 60;

  useEffect(() => { storage.set(STORAGE_KEYS.FOCUS_MINUTES, String(focusMinutes)); }, [focusMinutes]);
  useEffect(() => { storage.set(STORAGE_KEYS.FOCUS_MOOD, selectedMood); }, [selectedMood]);
  useEffect(() => { storage.set(STORAGE_KEYS.TIMER_RUNNING, String(isRunning)); }, [isRunning]);
  useEffect(() => {
    if (endTime) storage.set(STORAGE_KEYS.TIMER_END, String(endTime));
    else storage.remove(STORAGE_KEYS.TIMER_END);
  }, [endTime]);

  // tick
  useEffect(() => {
    if (!isRunning || endTime === null) {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = window.setInterval(() => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) setIsRunning(false);
    }, 1000);
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
  }, [isRunning, endTime]);

  // session complete
  useEffect(() => {
    if (timeLeft !== 0 || isRunning || sessionSavedRef.current) return;
    sessionSavedRef.current = true;
    setEndTime(null);
    saveFocusSession({
      duration_minutes: focusMinutes,
      mood_before: selectedMood,
      completed_at: new Date().toISOString(),
    })
      .then(() => setStatusMessage(`Отлично! ${focusMinutes} мин сохранены 🎉`))
      .catch(() => setErrorMessage('Не удалось сохранить сессию'));
  }, [timeLeft, isRunning, focusMinutes, selectedMood]);

  const start = useCallback(async () => {
    if (isRunning) {
      setEndTime(null);
      setIsRunning(false);
      await logBehavior('delay');
      setStatusMessage('Пауза');
      return;
    }
    sessionSavedRef.current = false;
    const seconds = timeLeft === 0 ? sessionTime : timeLeft;
    setEndTime(Date.now() + seconds * 1000);
    setIsRunning(true);
    setStatusMessage('Сессия запущена');
  }, [isRunning, timeLeft, sessionTime]);

  const reset = useCallback(async () => {
    const hadSession = isRunning || timeLeft < sessionTime;
    setTimeLeft(sessionTime);
    setIsRunning(false);
    setEndTime(null);
    sessionSavedRef.current = false;
    setStatusMessage('');
    setErrorMessage('');
    if (hadSession) await logBehavior('quit');
  }, [isRunning, timeLeft, sessionTime]);

  const changeDuration = useCallback((minutes: number) => {
    setFocusMinutes(minutes);
    if (!isRunning) setTimeLeft(minutes * 60);
  }, [isRunning]);

  return {
    focusMinutes, selectedMood, setSelectedMood,
    isRunning, timeLeft, sessionTime,
    statusMessage, errorMessage,
    start, reset, changeDuration,
  };
}