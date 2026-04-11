import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import "../styles/settings.css";

export interface SettingsPageProps {
  toggleTheme: () => void;
  theme: "light" | "dark";
  onLogout: () => void;
}

interface SettingRowProps {
  title: string;
  description: string;
  children?: ReactNode;
}

const STORAGE_KEYS = {
  dayReminder: "settings_dayReminder",
  pomodoroNotify: "settings_pomodoroNotify",
};

type FeedbackType = "success" | "error";

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

const SettingRow: React.FC<SettingRowProps> = React.memo(
  ({ title, description, children }) => (
    <div className="setting-row">
      <div className="setting-left">
        <div className="setting-title">{title}</div>
        <div className="setting-desc">{description}</div>
      </div>
      {children && <div className="setting-control">{children}</div>}
    </div>
  )
);

SettingRow.displayName = "SettingRow";

const SettingsPage: React.FC<SettingsPageProps> = ({
  toggleTheme,
  theme,
  onLogout,
}) => {
  const [dayReminder, setDayReminder] = useState(() =>
    getStoredBool(STORAGE_KEYS.dayReminder, true)
  );

  const [pomodoroNotify, setPomodoroNotify] = useState(() =>
    getStoredBool(STORAGE_KEYS.pomodoroNotify, true)
  );

  const [showConfirm, setShowConfirm] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: FeedbackType;
    text: string;
  } | null>(null);

  const reminderTimeoutRef = useRef<number | null>(null);

  const isDark = theme === "dark";
  const notificationSupported = canUseNotifications();

  const pushFeedback = useCallback((type: FeedbackType, text: string) => {
    setFeedback({ type, text });
  }, []);

  const clearFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.dayReminder, String(dayReminder));
  }, [dayReminder]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.pomodoroNotify, String(pomodoroNotify));
  }, [pomodoroNotify]);

  useEffect(() => {
    if (reminderTimeoutRef.current !== null) {
      window.clearTimeout(reminderTimeoutRef.current);
      reminderTimeoutRef.current = null;
    }

    if (!dayReminder) return;
    if (!notificationSupported || Notification.permission !== "granted") return;

    const scheduleNextReminder = () => {
      const now = new Date();
      const nextReminder = new Date();
      nextReminder.setHours(8, 30, 0, 0);

      if (nextReminder.getTime() <= now.getTime()) {
        nextReminder.setDate(nextReminder.getDate() + 1);
      }

      const delay = nextReminder.getTime() - now.getTime();

      reminderTimeoutRef.current = window.setTimeout(() => {
        if (Notification.permission === "granted") {
          new Notification("Начало дня", {
            body: "Пора начать продуктивный день 💪",
          });
        }

        scheduleNextReminder();
      }, delay);
    };

    scheduleNextReminder();

    return () => {
      if (reminderTimeoutRef.current !== null) {
        window.clearTimeout(reminderTimeoutRef.current);
        reminderTimeoutRef.current = null;
      }
    };
  }, [dayReminder, notificationSupported]);

  const ensureNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!notificationSupported) {
      pushFeedback("error", "Уведомления не поддерживаются в этом браузере.");
      return false;
    }

    if (Notification.permission === "granted") return true;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      pushFeedback("error", "Чтобы включить уведомления, нужно разрешить их в браузере.");
      return false;
    }

    return true;
  }, [notificationSupported, pushFeedback]);

  const handleToggleDay = useCallback(async () => {
    const nextValue = !dayReminder;

    if (nextValue) {
      const allowed = await ensureNotificationPermission();
      if (!allowed) return;
      setDayReminder(true);
      pushFeedback("success", "Напоминание о начале дня включено.");
      return;
    }

    setDayReminder(false);
    pushFeedback("success", "Напоминание о начале дня выключено.");
  }, [dayReminder, ensureNotificationPermission, pushFeedback]);

  const handleTogglePomodoro = useCallback(async () => {
    const nextValue = !pomodoroNotify;

    if (nextValue) {
      const allowed = await ensureNotificationPermission();
      if (!allowed) return;
      setPomodoroNotify(true);
      pushFeedback("success", "Уведомления о завершении фокуса включены.");
      return;
    }

    setPomodoroNotify(false);
    pushFeedback("success", "Уведомления о завершении фокуса выключены.");
  }, [pomodoroNotify, ensureNotificationPermission, pushFeedback]);

  const handleTestNotification = useCallback(async () => {
    const allowed = await ensureNotificationPermission();
    if (!allowed) return;

    new Notification("Проверка уведомления", {
      body: "Уведомления работают нормально ✅",
    });

    pushFeedback("success", "Тестовое уведомление отправлено.");
  }, [ensureNotificationPermission, pushFeedback]);

  const handleLogout = useCallback(() => {
    setShowConfirm(false);
    onLogout();
  }, [onLogout]);

  return (
    <section className="settings-page">
      <header className="settings-header">
        <div>
          <p className="section-label">Настройки</p>
          <h1 className="settings-title">Управление приложением</h1>
          <p className="settings-subtitle">
            Внешний вид, уведомления и выход из аккаунта
          </p>
        </div>

        <div className="settings-header__badge">
          {isDark ? "🌙 Тёмная тема" : "☀️ Светлая тема"}
        </div>
      </header>

      {feedback && (
        <div
          className={
            feedback.type === "success"
              ? "settings-message settings-message--success"
              : "settings-message settings-message--error"
          }
          role="alert"
        >
          {feedback.text}
        </div>
      )}

      <section className="settings-section">
        <h3 className="section-title">Внешний вид</h3>

        <div className="settings-card card">
          <SettingRow
            title="Тема оформления"
            description={
              isDark
                ? "Сейчас используется тёмная тема"
                : "Сейчас используется светлая тема"
            }
          >
            <button
              type="button"
              className="btn btn--outline"
              onClick={toggleTheme}
              aria-label={
                isDark
                  ? "Переключить на светлую тему"
                  : "Переключить на тёмную тему"
              }
            >
              {isDark ? "☀️ Светлая" : "🌙 Тёмная"}
            </button>
          </SettingRow>
        </div>
      </section>

      <section className="settings-section">
        <h3 className="section-title">Уведомления</h3>

        <div className="settings-card card settings-list">
          <SettingRow
            title="Напоминание о начале дня"
            description="Уведомление каждый день в 8:30"
          >
            <label className="toggle-switch" aria-label="Напоминание о начале дня">
              <input
                className="toggle-input sr-only"
                type="checkbox"
                checked={dayReminder}
                onChange={() => {
                  void handleToggleDay();
                }}
              />
              <span className="toggle-label" />
            </label>
          </SettingRow>

          <SettingRow
            title="Окончание фокус-сессии"
            description="Звуковой сигнал и уведомление, когда таймер завершён"
          >
            <label className="toggle-switch" aria-label="Уведомления о завершении фокус-сессии">
              <input
                className="toggle-input sr-only"
                type="checkbox"
                checked={pomodoroNotify}
                onChange={() => {
                  void handleTogglePomodoro();
                }}
              />
              <span className="toggle-label" />
            </label>
          </SettingRow>

          <div className="settings-actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                void handleTestNotification();
              }}
            >
              🔔 Проверить уведомление
            </button>
          </div>

          {!notificationSupported && (
            <p className="settings-note">
              Этот браузер не поддерживает уведомления.
            </p>
          )}
        </div>
      </section>

      <section className="settings-section">
        <h3 className="section-title">Дополнительно</h3>

        <div className="settings-card card settings-list">
          <SettingRow title="Язык интерфейса" description="Русский">
            <span className="setting-static-value">RU</span>
          </SettingRow>

          <SettingRow
            title="Выход из аккаунта"
            description="Завершить текущую сессию"
          >
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="btn btn-danger"
            >
              Выйти
            </button>
          </SettingRow>
        </div>
      </section>

      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal card">
            <h3>Подтверждение</h3>
            <p>Ты точно хочешь выйти из аккаунта?</p>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => setShowConfirm(false)}
              >
                Отмена
              </button>

              <button
                type="button"
                className="btn btn-danger"
                onClick={handleLogout}
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default SettingsPage;