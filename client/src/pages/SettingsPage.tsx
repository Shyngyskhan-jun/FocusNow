import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import "../styles/settings.css";
import { LangSwitcher } from '../components/LangSwitcher';

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
  const { t } = useTranslation();

  const [dayReminder, setDayReminder] = useState(() =>
    getStoredBool(STORAGE_KEYS.dayReminder, true)
  );

  const [pomodoroNotify, setPomodoroNotify] = useState(() =>
    getStoredBool(STORAGE_KEYS.pomodoroNotify, true)
  );

  const [showConfirm, setShowConfirm] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: FeedbackType;
    textKey: string;
  } | null>(null);

  const reminderTimeoutRef = useRef<number | null>(null);

  const isDark = theme === "dark";
  const notificationSupported = canUseNotifications();

  const pushFeedback = useCallback((type: FeedbackType, textKey: string) => {
    setFeedback({ type, textKey });
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
          new Notification(t('settings.notifications.day_start_title'), {
            body: t('settings.notifications.day_start_body'),
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
  }, [dayReminder, notificationSupported, t]);

  const ensureNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!notificationSupported) {
      pushFeedback("error", "settings.feedback.not_supported");
      return false;
    }

    if (Notification.permission === "granted") return true;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      pushFeedback("error", "settings.feedback.permission_denied");
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
      pushFeedback("success", "settings.feedback.day_reminder_on");
      return;
    }

    setDayReminder(false);
    pushFeedback("success", "settings.feedback.day_reminder_off");
  }, [dayReminder, ensureNotificationPermission, pushFeedback]);

  const handleTogglePomodoro = useCallback(async () => {
    const nextValue = !pomodoroNotify;

    if (nextValue) {
      const allowed = await ensureNotificationPermission();
      if (!allowed) return;
      setPomodoroNotify(true);
      pushFeedback("success", "settings.feedback.pomodoro_on");
      return;
    }

    setPomodoroNotify(false);
    pushFeedback("success", "settings.feedback.pomodoro_off");
  }, [pomodoroNotify, ensureNotificationPermission, pushFeedback]);

  const handleTestNotification = useCallback(async () => {
    const allowed = await ensureNotificationPermission();
    if (!allowed) return;

    new Notification(t('settings.notifications.test_title'), {
      body: t('settings.notifications.test_body'),
    });

    pushFeedback("success", "settings.feedback.test_sent");
  }, [ensureNotificationPermission, pushFeedback, t]);

  const handleLogout = useCallback(() => {
    setShowConfirm(false);
    onLogout();
  }, [onLogout]);

  return (
    <section className="settings-page">
      <header className="settings-header">
        <div>
          <p className="section-label">{t('settings.header.label')}</p>
          <h1 className="settings-title">{t('settings.header.title')}</h1>
          <p className="settings-subtitle">
            {t('settings.header.subtitle')}
          </p>
        </div>

        <div className="settings-header__badge">
          {isDark ? `🌙 ${t('settings.theme.dark_badge')}` : `☀️ ${t('settings.theme.light_badge')}`}
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
          {t(feedback.textKey)}
        </div>
      )}

      <section className="settings-section">
        <h3 className="section-title">{t('settings.sections.appearance')}</h3>

        <div className="settings-card card">
          <SettingRow
            title={t('settings.theme.title')}
            description={
              isDark
                ? t('settings.theme.desc_dark')
                : t('settings.theme.desc_light')
            }
          >
            <button
              type="button"
              className="btn btn--outline"
              onClick={toggleTheme}
              aria-label={
                isDark
                  ? t('settings.theme.aria_to_light')
                  : t('settings.theme.aria_to_dark')
              }
            >
              {isDark ? `☀️ ${t('settings.theme.btn_light')}` : `🌙 ${t('settings.theme.btn_dark')}`}
            </button>
          </SettingRow>
        </div>
      </section>

      <section className="settings-section">
        <h3 className="section-title">{t('settings.sections.notifications')}</h3>

        <div className="settings-card card settings-list">
          <SettingRow
            title={t('settings.reminder.day_title')}
            description={t('settings.reminder.day_desc')}
          >
            <label className="toggle-switch" aria-label={t('settings.reminder.day_title')}>
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
            title={t('settings.reminder.focus_title')}
            description={t('settings.reminder.focus_desc')}
          >
            <label className="toggle-switch" aria-label={t('settings.reminder.focus_title')}>
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
              🔔 {t('settings.reminder.btn_test')}
            </button>
          </div>

          {!notificationSupported && (
            <p className="settings-note">
              {t('settings.notifications.not_supported_note')}
            </p>
          )}
        </div>
      </section>

      <section className="settings-section">
        <h3 className="section-title">{t('settings.sections.additional')}</h3>

        <div className="settings-card card settings-list">
          <SettingRow 
            title={t('settings.lang.title')} 
            description={t('settings.lang.current')}
          >
            <LangSwitcher />
          </SettingRow>

          <SettingRow
            title={t('settings.logout.title')}
            description={t('settings.logout.desc')}
          >
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="btn btn-danger"
            >
              {t('settings.logout.btn')}
            </button>
          </SettingRow>
        </div>
      </section>

      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal card">
            <h3>{t('settings.confirm.title')}</h3>
            <p>{t('settings.confirm.text')}</p>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => setShowConfirm(false)}
              >
                {t('settings.confirm.btn_cancel')}
              </button>

              <button
                type="button"
                className="btn btn-danger"
                onClick={handleLogout}
              >
                {t('settings.confirm.btn_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default SettingsPage;