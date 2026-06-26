import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../services/api";
import "../styles/focus.css";
import { useTranslation } from "react-i18next";
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
  label: string; // Здесь теперь будут лежать ключи локализации
  emoji: string;
  hint: string;  // И здесь тоже
}> = [
  { value: "tired", label: "mood.tired.label", emoji: "😴", hint: "mood.tired.hint" },
  { value: "normal", label: "mood.normal.label", emoji: "😐", hint: "mood.normal.hint" },
  { value: "energized", label: "mood.energized.label", emoji: "⚡", hint: "mood.energized.hint" },
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
  const { t } = useTranslation();

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

  // Логирование поведения (Аналитика прокрастинации)
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

  // Сохранение успешной сессии в БД
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

        showStatus(t("focus.status_saved", { minutes }));
      } catch (error) {
        console.error("Ошибка при сохранении сессии:", error);
        showError(t("focus.error_save"));
      }
    },
    [selectedMood, showError, showStatus, t]
  );

  // Синхронизация стейта с LocalStorage
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

  // Вычисление оставшегося времени при изменении дедлайна таймера
  useEffect(() => {
    if (endTime === null) return;

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

  // Хэндлер тиков каждую секунду (Interval)
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

  // Триггер завершения фокус сессии
  useEffect(() => {
    if (timeLeft !== 0 || isRunning) return;
    if (sessionSavedRef.current) return;

    sessionSavedRef.current = true;
    setEndTime(null);

    const pomodoroNotifyEnabled = getStoredBool(POMODORO_NOTIFY_STORAGE_KEY, true);

    if (pomodoroNotifyEnabled) {
      showBrowserNotification(t("focus.notification_title"), t("focus.notification_body"));
      playBeep();
    }

    void saveSessionToDB(focusMinutes);
  }, [timeLeft, isRunning, saveSessionToDB, focusMinutes, t]);

  // Обновление вкладки браузера (Document Title)
  useEffect(() => {
    document.title = isRunning
      ? `${formatTime(timeLeft)} — FocusNow`
      : "FocusNow";

    return () => {
      document.title = "FocusNow";
    };
  }, [timeLeft, isRunning]);

  const blockedSitesList = useMemo(
    () => blockedSites.map((site) => site.trim()).filter(Boolean),
    [blockedSites]
  );

  // Добавление сайта в черный список
  const handleAddBlockedSite = useCallback(() => {
    const site = normalizeSite(newSite);
    if (!site) return;

    if (blockedSitesList.includes(site)) {
      showError(t("focus.error_site_exists"));
      return;
    }

    setBlockedSites((prev) => [...prev, site]);
    setNewSite("");
    showStatus(t("focus.status_site_added", { site }));
  }, [newSite, blockedSitesList, showError, showStatus, t]);

  // Удаление сайта из черного списка
  const handleRemoveSite = useCallback(
    (siteToRemove: string) => {
      setBlockedSites((prev) => prev.filter((site) => site !== siteToRemove));
      showStatus(t("focus.status_site_removed", { site: siteToRemove }));
    },
    [showStatus, t]
  );

  // Запуск или Пауза таймера
  const handleStartPause = useCallback(async () => {
    if (isRunning) {
      setEndTime(null);
      setIsRunning(false);
      await logBehavior("delay");
      showStatus(t("focus.status_paused"));
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

    showStatus(t("focus.status_started"));
  }, [isRunning, timeLeft, sessionTime, logBehavior, showStatus, t]);

  // Сброс таймера
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
          <h1 className="focus-page__title">{t("focus.title")}</h1>
          <p className="focus-page__subtitle">{t("focus.subtitle")}</p>
        </div>

        <div className="focus-page__badge">
          {selectedMood === "tired" && t("focus.badge_tired")}
          {selectedMood === "normal" && t("focus.badge_normal")}
          {selectedMood === "energized" && t("focus.badge_energized")}
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
        {/* Карточка таймера */}
        <div className="focus-card focus-card--timer card">
          <div className="focus-card__head">
            <h3>{t("focus.timer_title")}</h3>
            <span className="badge">{t("focus.timer_stat_notice")}</span>
          </div>

          <div className="timer-display" aria-live="polite">
            {formatTime(timeLeft)}
          </div>

          <div className="timer-subtext">
            {isRunning ? t("focus.timer_running") : timeLeft === sessionTime ? t("focus.timer_ready") : t("focus.timer_paused")}
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
            <button className="btn btn--primary btn--lg" onClick={handleStartPause} type="button">
              {isRunning ? t("focus.btn_pause") : timeLeft === sessionTime ? t("focus.btn_start") : t("focus.btn_continue")}
            </button>

            <button className="btn btn--ghost btn--lg" onClick={handleReset} type="button">
              {t("focus.btn_reset")}
            </button>
          </div>
        </div>

        {/* Настройка длительности */}
        <div className="focus-card card">
          <div className="focus-card__head">
            <h3>{t("focus.duration_title")}</h3>
            <span className="focus-card__meta">
              {focusMinutes} {t("minutes_short")}
            </span>
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
          <div className="focus-card__hint">{t("focus.duration_hint")}</div>

          {/* Селектор настроения */}
          <div className="mood-selector">
            <h3>{t("focus.mood_title")}</h3>
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
                    <strong>{t(mood.label)}</strong>
                    <small>{t(mood.hint)}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Список отвлечений */}
      <div className="focus-card card">
        <div className="focus-card__head">
          <div>
            <h3>{t("focus.distractions_title")}</h3>
            <p className="focus-card__hint">{t("focus.distractions_hint")}</p>
          </div>
        </div>

        <div className="site-input-row">
          <input
            type="text"
            className="form-input"
            placeholder={t("focus.distractions_placeholder")}
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
            {t("focus.distractions_btn_add")}
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
                aria-label={`Remove ${site} from list`}
                title={t("focus.btn_reset")} // Используем универсальный "Сброс/Удалить" или добавь ключ
              >
                ✕
              </button>
            </li>
          ))}

          {blockedSitesList.length === 0 && (
            <li className="blocked-empty">{t("focus.distractions_empty")}</li>
          )}
        </ul>
      </div>
    </section>
  );
};

export default FocusSessionsPage;