import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../services/api";
import "../styles/focus.css";

const DEFAULT_FOCUS_MINUTES = 25;

const BLOCKED_SITES_STORAGE_KEY = "focusnow_blocked_sites";
const POMODORO_NOTIFY_STORAGE_KEY = "settings_pomodoroNotify";
const TIMER_END_STORAGE_KEY = "focusnow_timer_end";
const TIMER_RUNNING_STORAGE_KEY = "focusnow_timer_running";
const FOCUS_MINUTES_STORAGE_KEY = "focusnow_focus_minutes";
const FOCUS_MOOD_STORAGE_KEY = "focusnow_focus_mood";

const DEFAULT_BLOCKED_SITES = ["facebook.com", "instagram.com", "tiktok.com"];

type MoodValue = "tired" | "normal" | "energized";

const MOODS: Array<{
  value: MoodValue;
  label: string;
  emoji: string;
  hint: string;
}> = [
    { value: "tired", label: "Устал", emoji: "😴", hint: "Мало энергии" },
    { value: "normal", label: "Нормально", emoji: "😐", hint: "Можно работать" },
    { value: "energized", label: "Энергично", emoji: "⚡", hint: "Полный заряд" },
  ];

const canUseNotifications = (): boolean => {
  return typeof window !== "undefined" && "Notification" in window;
};

const getStoredBool = (key: string, defaultValue: boolean) => {
  if (typeof window === "undefined") return defaultValue;

  try {
    const val = localStorage.getItem(key);
    if (val === null) return defaultValue;
    return val === "true";
  } catch {
    return defaultValue;
  }
};

const getStoredNumber = (key: string, defaultValue: number) => {
  if (typeof window === "undefined") return defaultValue;

  try {
    const val = localStorage.getItem(key);
    if (val === null) return defaultValue;

    const parsed = Number(val);
    return Number.isFinite(parsed) ? parsed : defaultValue;
  } catch {
    return defaultValue;
  }
};

const getStoredNullableNumber = (key: string): number | null => {
  if (typeof window === "undefined") return null;

  try {
    const val = localStorage.getItem(key);
    if (val === null) return null;

    const parsed = Number(val);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const getStoredString = (key: string, defaultValue: string) => {
  if (typeof window === "undefined") return defaultValue;

  try {
    const val = localStorage.getItem(key);
    return val ?? defaultValue;
  } catch {
    return defaultValue;
  }
};

const formatTime = (seconds: number): string => {
  const safeSeconds = Math.max(0, seconds);
  const m = Math.floor(safeSeconds / 60);
  const s = safeSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const normalizeSite = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
};

const loadBlockedSites = (): string[] => {
  try {
    if (typeof window === "undefined") return DEFAULT_BLOCKED_SITES;

    const raw = localStorage.getItem(BLOCKED_SITES_STORAGE_KEY);
    if (!raw) return DEFAULT_BLOCKED_SITES;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_BLOCKED_SITES;

    const cleaned = parsed
      .map(String)
      .map(normalizeSite)
      .filter(Boolean);

    return Array.from(new Set(cleaned));
  } catch {
    return DEFAULT_BLOCKED_SITES;
  }
};

const playBeep = () => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880;

    gainNode.gain.value = 0.06;

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();

    window.setTimeout(() => {
      oscillator.stop();
      audioContext.close().catch(() => undefined);
    }, 240);
  } catch {
    // no-op
  }
};

const showBrowserNotification = (title: string, body: string) => {
  if (!canUseNotifications()) return;
  if (Notification.permission !== "granted") return;

  new Notification(title, { body });
};

const FocusSessionsPage: React.FC = () => {
  const [focusMinutes, setFocusMinutes] = useState<number>(() =>
    getStoredNumber(FOCUS_MINUTES_STORAGE_KEY, DEFAULT_FOCUS_MINUTES)
  );

  const [selectedMood, setSelectedMood] = useState<MoodValue>(() =>
    getStoredString(FOCUS_MOOD_STORAGE_KEY, "normal") as MoodValue
  );

  const initialEndTime = getStoredNullableNumber(TIMER_END_STORAGE_KEY);

  const [isRunning, setIsRunning] = useState<boolean>(() =>
    getStoredBool(TIMER_RUNNING_STORAGE_KEY, false)
  );

  const [endTime, setEndTime] = useState<number | null>(() => {
    if (!getStoredBool(TIMER_RUNNING_STORAGE_KEY, false)) return null;
    return initialEndTime;
  });

  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (getStoredBool(TIMER_RUNNING_STORAGE_KEY, false) && initialEndTime) {
      return Math.max(0, Math.floor((initialEndTime - Date.now()) / 1000));
    }

    return getStoredNumber(FOCUS_MINUTES_STORAGE_KEY, DEFAULT_FOCUS_MINUTES) * 60;
  });

  const [blockedSites, setBlockedSites] = useState<string[]>(loadBlockedSites);
  const [newSite, setNewSite] = useState<string>("");

  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const intervalRef = useRef<number | null>(null);
  const sessionSavedRef = useRef(false);

  const sessionTime = focusMinutes * 60;

  const showStatus = useCallback((message: string) => {
    setStatusMessage(message);
    setErrorMessage("");
  }, []);

  const showError = useCallback((message: string) => {
    setErrorMessage(message);
    setStatusMessage("");
  }, []);

  const logBehavior = useCallback(async (actionType: "delay" | "quit") => {
    try {
      await apiFetch("/behavior", {
        method: "POST",
        body: JSON.stringify({
          action_type: actionType,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error("Ошибка логирования поведения:", error);
    }
  }, []);

  const saveSessionToDB = useCallback(
    async (minutes: number) => {
      try {
        await apiFetch("/focus", {
          method: "POST",
          body: JSON.stringify({
            duration_minutes: minutes,
            mood_before: selectedMood,
            completed_at: new Date().toISOString(),
          }),
        });

        showStatus(
          `Отлично! ${minutes} мин фокуса сохранены в статистику 🎉`
        );
      } catch (error) {
        console.error("Ошибка при сохранении сессии:", error);
        showError("Не удалось сохранить сессию в базу данных.");
      }
    },
    [selectedMood, showError, showStatus]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(BLOCKED_SITES_STORAGE_KEY, JSON.stringify(blockedSites));
  }, [blockedSites]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(FOCUS_MINUTES_STORAGE_KEY, String(focusMinutes));
  }, [focusMinutes]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(FOCUS_MOOD_STORAGE_KEY, selectedMood);
  }, [selectedMood]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (endTime !== null) {
      localStorage.setItem(TIMER_END_STORAGE_KEY, String(endTime));
    } else {
      localStorage.removeItem(TIMER_END_STORAGE_KEY);
    }
  }, [endTime]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(TIMER_RUNNING_STORAGE_KEY, String(isRunning));
  }, [isRunning]);

  useEffect(() => {
    if (endTime === null) {
      return; //тут была ошибка исправлена уже
    }

    const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));

    if (remaining <= 0) {
      setTimeLeft(0);
      setIsRunning(false);
      setEndTime(null);
      return;
    }

    setTimeLeft(remaining);
    setIsRunning(true);
  }, [endTime, focusMinutes]);

  useEffect(() => {
    if (!isRunning || endTime === null) {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        setIsRunning(false);
      }
    }, 1000);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, endTime]);

  useEffect(() => {
    if (timeLeft !== 0 || isRunning) return;
    if (sessionSavedRef.current) return;

    sessionSavedRef.current = true;
    setEndTime(null);

    const pomodoroNotifyEnabled = getStoredBool(
      POMODORO_NOTIFY_STORAGE_KEY,
      true
    );

    if (pomodoroNotifyEnabled) {
      showBrowserNotification(
        "Фокус-сессия завершена",
        "Можно сделать перерыв ☕"
      );
      playBeep();
    }

    void saveSessionToDB(focusMinutes);
  }, [timeLeft, isRunning, saveSessionToDB, focusMinutes]);

  useEffect(() => {
    document.title = isRunning
      ? `${formatTime(timeLeft)} — Фокус | FocusNow`
      : "FocusNow";

    return () => {
      document.title = "FocusNow";
    };
  }, [timeLeft, isRunning]);

  const blockedSitesList = useMemo(
    () => blockedSites.map((site) => site.trim()).filter(Boolean),
    [blockedSites]
  );

  const handleAddBlockedSite = useCallback(() => {
    const site = normalizeSite(newSite);
    if (!site) return;

    if (blockedSitesList.includes(site)) {
      showError("Этот сайт уже есть в списке");
      return;
    }

    setBlockedSites((prev) => [...prev, site]);
    setNewSite("");
    showStatus(`Сайт ${site} добавлен в список`);
  }, [newSite, blockedSitesList, showError, showStatus]);

  const handleRemoveSite = useCallback(
    (siteToRemove: string) => {
      setBlockedSites((prev) => prev.filter((site) => site !== siteToRemove));
      showStatus(`Сайт ${siteToRemove} удалён из списка`);
    },
    [showStatus]
  );

  const handleStartPause = useCallback(async () => {
    if (isRunning) {
      setEndTime(null);
      setIsRunning(false);
      await logBehavior("delay");
      showStatus("Сессия поставлена на паузу");
      return;
    }

    sessionSavedRef.current = false;

    if (timeLeft === 0) {
      setTimeLeft(sessionTime);
    }

    const currentSeconds = timeLeft === 0 ? sessionTime : timeLeft;
    const newEndTime = Date.now() + currentSeconds * 1000;
    setEndTime(newEndTime);
    setIsRunning(true);

    if (canUseNotifications() && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {
        // no-op
      }
    }

    showStatus("Фокус-сессия запущена");
  }, [isRunning, timeLeft, sessionTime, logBehavior, showStatus]);

  const handleReset = useCallback(async () => {
    const hadActiveSession = isRunning || timeLeft < sessionTime;

    setTimeLeft(sessionTime);
    setIsRunning(false);
    setEndTime(null);
    sessionSavedRef.current = false;
    setStatusMessage("");
    setErrorMessage("");

    if (hadActiveSession) {
      await logBehavior("quit");
    }
  }, [isRunning, timeLeft, sessionTime, logBehavior]);

  return (
    <section className="focus-page">
      <header className="focus-page__header">
        <div>
          <p className="section-label">Pomodoro</p>
          <h1 className="focus-page__title">Фокус-сессия</h1>
          <p className="focus-page__subtitle">
            Никаких отвлечений. Только ты и твоя задача.
          </p>
        </div>

        <div className="focus-page__badge">
          {selectedMood === "tired" && "😴 Устал"}
          {selectedMood === "normal" && "😐 Нормально"}
          {selectedMood === "energized" && "⚡ Энергично"}
        </div>
      </header>

      {(statusMessage || errorMessage) && (
        <div
          className={errorMessage ? "focus-message focus-message--error" : "focus-message focus-message--success"}
          role="alert"
        >
          {errorMessage || statusMessage}
        </div>
      )}

      <div className="focus-grid">
        <div className="focus-card focus-card--timer card">
          <div className="focus-card__head">
            <h3>Таймер</h3>
            <span className="badge">Сохраняется в статистику</span>
          </div>

          <div className="timer-display" aria-live="polite">
            {formatTime(timeLeft)}
          </div>

          <div className="timer-subtext">
            {isRunning ? "Сессия идёт" : timeLeft === sessionTime ? "Готов к старту" : "На паузе"}
          </div>

          <div className="timer-progress">
            <div
              className="timer-progress__fill"
              style={{
                width: `${Math.min(
                  100,
                  Math.round(((sessionTime - timeLeft) / Math.max(1, sessionTime)) * 100)
                )}%`,
              }}
            />
          </div>

          <div className="timer-controls">
            <button
              className="btn btn--primary btn--lg"
              onClick={handleStartPause}
              type="button"
            >
              {isRunning ? "Пауза" : timeLeft === sessionTime ? "Начать" : "Продолжить"}
            </button>

            <button
              className="btn btn--ghost btn--lg"
              onClick={handleReset}
              type="button"
            >
              Сброс
            </button>
          </div>
        </div>

        <div className="focus-card card">
          <div className="focus-card__head">
            <h3>Длительность</h3>
            <span className="focus-card__meta">{focusMinutes} мин</span>
          </div>

          <input
            type="range"
            min="5"
            max="120"
            step="5"
            value={focusMinutes}
            onChange={(e) => {
              const minutes = Number(e.target.value);
              setFocusMinutes(minutes);
              if (!isRunning) {
                setTimeLeft(minutes * 60);
              }
            }}
          />
          <div className="focus-card__hint">
            Настрой удобный интервал под задачу.
          </div>

          <div className="mood-selector">
            <h3>Состояние перед началом</h3>
            <div className="mood-selector__grid">
              {MOODS.map((mood) => (
                <button
                  key={mood.value}
                  type="button"
                  className={`mood-chip ${selectedMood === mood.value ? "is-active" : ""}`}
                  onClick={() => setSelectedMood(mood.value)}
                >
                  <span className="mood-chip__emoji" aria-hidden="true">
                    {mood.emoji}
                  </span>
                  <span className="mood-chip__text">
                    <strong>{mood.label}</strong>
                    <small>{mood.hint}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="focus-card card">
        <div className="focus-card__head">
          <div>
            <h3>Список отвлечений</h3>
            <p className="focus-card__hint">
              Пока это локальный список для будущей блокировки и аналитики.
            </p>
          </div>
        </div>

        <div className="site-input-row">
          <input
            type="text"
            className="form-input"
            placeholder="Например, vk.com"
            value={newSite}
            onChange={(e) => setNewSite(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddBlockedSite();
              }
            }}
          />
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleAddBlockedSite}
            disabled={!normalizeSite(newSite)}
          >
            Добавить
          </button>
        </div>

        <ul className="blocked-list">
          {blockedSitesList.map((site) => (
            <li key={site} className="blocked-item">
              <span className="blocked-item__site">{site}</span>
              <button
                type="button"
                className="btn btn--ghost btn--sm blocked-item__remove"
                onClick={() => handleRemoveSite(site)}
                aria-label={`Удалить ${site} из списка`}
                title="Удалить"
              >
                ✕
              </button>
            </li>
          ))}

          {blockedSitesList.length === 0 && (
            <li className="blocked-empty">Список пуст.</li>
          )}
        </ul>
      </div>
    </section>
  );
};

export default FocusSessionsPage;