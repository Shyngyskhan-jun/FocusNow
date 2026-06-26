import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../services/api';
import '../styles/profile.css';

export type Occupation = 'student' | 'pupil' | 'worker' | 'freelancer' | 'other';
export type DailyGoalOption = 60 | 90 | 120 | 180 | 240;

export interface UserProfile {
  name: string;
  email: string;
  joinedDate: string;
  occupation?: Occupation;
  bio?: string;
  dailyGoalMinutes?: DailyGoalOption;
  totalFocusMinutes: number;
  longestStreak: number;
  currentStreak: number;
  tasksCompleted: number;
  tasksTotal: number;
}

interface EditForm {
  name: string;
  occupation: Occupation;
  bio: string;
  dailyGoalMinutes: DailyGoalOption;
}

const OCCUPATION_OPTIONS: { value: Occupation; emoji: string; labelKey: string }[] = [
  { value: 'pupil',      emoji: '🎒', labelKey: 'occupation.pupil' },
  { value: 'student',    emoji: '🎓', labelKey: 'occupation.student' },
  { value: 'worker',     emoji: '💼', labelKey: 'occupation.worker' },
  { value: 'freelancer', emoji: '💻', labelKey: 'occupation.freelancer' },
  { value: 'other',      emoji: '✨', labelKey: 'occupation.other' },
];

const DAILY_GOALS: { value: DailyGoalOption; labelKey: string }[] = [
  { value: 60,  labelKey: 'goal.hours_1' },
  { value: 90,  labelKey: 'goal.hours_1_5' },
  { value: 120, labelKey: 'goal.hours_2' },
  { value: 180, labelKey: 'goal.hours_3' },
  { value: 240, labelKey: 'goal.hours_4' },
];

const getInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return (parts[0]?.[0] ?? '').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
};

const getTaskRate = (completed: number, total: number) => {
  if (!total) return 0;
  return Math.round((completed / total) * 100);
};

/* ── Компонент StatCard ── */
const StatCard: React.FC<{
  value: string | number;
  label: string;
  icon: string;
  accent?: boolean;
}> = React.memo(({ value, label, icon, accent }) => (
  <div className={`profile-stat-card ${accent ? 'profile-stat-card--accent' : ''}`}>
    <span className="profile-stat-icon">{icon}</span>
    <span className="profile-stat-value">{value}</span>
    <span className="profile-stat-label">{label}</span>
  </div>
));
StatCard.displayName = 'StatCard';

/* ── Модалка редактирования ── */
const EditModal: React.FC<{
  initial: EditForm;
  onSave: (form: EditForm) => Promise<void>;
  onClose: () => void;
}> = ({ initial, onSave, onClose }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<EditForm>(initial);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof EditForm>(key: K, value: EditForm[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) { 
      setError(t('profile.error.empty_name')); 
      return; 
    }
    setIsSaving(true);
    setError('');
    try {
      await onSave({ ...form, name: form.name.trim() });
    } catch (e: any) {
      setError(e.message || t('profile.error.save_failed'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="profile-modal-backdrop" onClick={onClose}>
      <div className="profile-modal" onClick={e => e.stopPropagation()}>
        <div className="profile-modal__header">
          <h3 className="profile-modal__title">{t('profile.modal.title')}</h3>
          <button className="profile-modal__close" onClick={onClose} aria-label={t('profile.modal.close')}>✕</button>
        </div>

        {error && <div className="profile-modal__error">{error}</div>}

        {/* Name */}
        <div className="profile-field">
          <label className="profile-field__label">{t('profile.modal.name_label')}</label>
          <input
            className="profile-field__input"
            type="text"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder={t('profile.modal.name_placeholder')}
            autoFocus
            maxLength={60}
          />
        </div>

        {/* Occupation */}
        <div className="profile-field">
          <label className="profile-field__label">{t('profile.modal.occ_label')}</label>
          <div className="occupation-grid">
            {OCCUPATION_OPTIONS.map(({ value, emoji, labelKey }) => (
              <button
                key={value}
                className={`occupation-btn ${form.occupation === value ? 'occupation-btn--active' : ''}`}
                onClick={() => set('occupation', value)}
                type="button"
              >
                <span>{emoji}</span>
                <span>{t(labelKey)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bio */}
        <div className="profile-field">
          <label className="profile-field__label">
            {t('profile.modal.bio_label')} <span className="profile-field__hint">{t('profile.modal.bio_optional')}</span>
          </label>
          <textarea
            className="profile-field__input profile-field__textarea"
            value={form.bio}
            onChange={e => set('bio', e.target.value)}
            placeholder={t('profile.modal.bio_placeholder')}
            rows={3}
            maxLength={200}
          />
          <span className="profile-field__counter">{form.bio.length}/200</span>
        </div>

        {/* Daily goal */}
        <div className="profile-field">
          <label className="profile-field__label">{t('profile.modal.goal_label')}</label>
          <div className="goal-pills">
            {DAILY_GOALS.map(({ value, labelKey }) => (
              <button
                key={value}
                className={`goal-pill ${form.dailyGoalMinutes === value ? 'goal-pill--active' : ''}`}
                onClick={() => set('dailyGoalMinutes', value)}
                type="button"
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="profile-modal__footer">
          <button className="profile-btn profile-btn--ghost" onClick={onClose} disabled={isSaving}>
            {t('profile.modal.btn_cancel')}
          </button>
          <button
            className="profile-btn profile-btn--primary"
            onClick={handleSave}
            disabled={isSaving || !form.name.trim()}
          >
            {isSaving ? t('profile.modal.btn_saving') : t('profile.modal.btn_save')}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Главная страница Профиля ── */
const ProfilePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch<UserProfile>('/user/profile');
      setUser(data);
    } catch (e: any) {
      setError(e.message || t('profile.empty_error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // Хелпер форматирования времени фокуса с учетом языка
  const formatFocusTime = useCallback((minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const hStr = t('time.hours_short');
    const mStr = t('time.minutes_short');
    
    if (h && m) return `${h} ${hStr} ${m} ${mStr}`;
    if (h) return `${h} ${hStr}`;
    return `${m} ${mStr}`;
  }, [t]);

  // Хелпер форматирования даты регистрации через Intl API
  const formatDate = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat(currentLang, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }, [currentLang]);

  const initials = useMemo(() => getInitials(user?.name ?? ''), [user?.name]);
  const joinedFormatted = useMemo(() => formatDate(user?.joinedDate ?? ''), [user?.joinedDate, formatDate]);
  
  const occupationInfo = useMemo(() => {
    if (!user?.occupation) return null;
    return OCCUPATION_OPTIONS.find(o => o.value === user.occupation);
  }, [user?.occupation]);

  const taskRate = useMemo(
    () => getTaskRate(user?.tasksCompleted ?? 0, user?.tasksTotal ?? 0),
    [user?.tasksCompleted, user?.tasksTotal]
  );

  const handleSave = useCallback(async (form: EditForm) => {
    await apiFetch('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(form),
    });
    setUser(prev => prev ? { ...prev, ...form } : prev);
    setIsModalOpen(false);
  }, []);

  const editInitial: EditForm = {
    name: user?.name ?? '',
    occupation: user?.occupation ?? 'other',
    bio: user?.bio ?? '',
    dailyGoalMinutes: user?.dailyGoalMinutes ?? 120,
  };

  if (loading) {
    return (
      <section className="profile-page">
        <div className="profile-empty">
          <div className="profile-empty__icon">⏳</div>
          <p>{t('profile.empty_loading')}</p>
        </div>
      </section>
    );
  }

  if (error || !user) {
    return (
      <section className="profile-page">
        <div className="profile-empty profile-empty--error">
          <div className="profile-empty__icon">⚠️</div>
          <p>{error || t('profile.no_data')}</p>
          <button className="profile-btn profile-btn--primary" onClick={fetchProfile}>
            {t('profile.btn_retry')}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="profile-page">
      {/* Header */}
      <header className="profile-page__header">
        <h1 className="profile-page__title">{t('profile.title')}</h1>
        <p className="profile-page__sub">{t('profile.subtitle')}</p>
      </header>

      {/* Identity card */}
      <div className="profile-identity-card">
        <div className="profile-avatar">
          {initials}
          <div className="profile-avatar__ring" />
        </div>

        <div className="profile-identity-info">
          <h2 className="profile-identity-name">{user.name || t('profile.no_name')}</h2>
          <p className="profile-identity-email">{user.email}</p>

          <div className="profile-identity-meta">
            {occupationInfo && (
              <span className="profile-meta-tag">
                {occupationInfo.emoji} {t(occupationInfo.labelKey)}
              </span>
            )}
            <span className="profile-meta-tag">
              {t('profile.joined_since', { date: joinedFormatted })}
            </span>
          </div>

          {user.bio && <p className="profile-bio">{user.bio}</p>}
        </div>

        <button
          className="profile-edit-btn"
          onClick={() => setIsModalOpen(true)}
          aria-label={t('profile.btn_edit')}
        >
          ✏️ {t('profile.btn_edit')}
        </button>
      </div>

      {/* Daily goal progress */}
      {user.dailyGoalMinutes && (
        <div className="profile-goal-card">
          <div className="profile-goal-card__top">
            <span className="profile-goal-card__label">{t('profile.goal_card_title')}</span>
            <span className="profile-goal-card__value">
              {t(DAILY_GOALS.find(g => g.value === user.dailyGoalMinutes)?.labelKey ?? '')}
            </span>
          </div>
          <div className="profile-goal-bar">
            <div
              className="profile-goal-fill"
              style={{
                width: `${Math.min(100, Math.round(((user.totalFocusMinutes % (user.dailyGoalMinutes ?? 120)) / (user.dailyGoalMinutes ?? 120)) * 100))}%`
              }}
            />
          </div>
        </div>
      )}

      {/* Stats */}
      <h3 className="profile-section-title">{t('profile.achievements_title')}</h3>

      <div className="profile-stats-grid">
        <StatCard
          icon="⏱"
          value={formatFocusTime(user.totalFocusMinutes)}
          label={t('profile.stat.total_focus')}
        />
        <StatCard
          icon="🔥"
          value={user.currentStreak}
          label={t('profile.stat.current_streak')}
          accent
        />
        <StatCard
          icon="🏆"
          value={user.longestStreak}
          label={t('profile.stat.longest_streak')}
        />
        <StatCard
          icon="✅"
          value={user.tasksCompleted}
          label={t('profile.stat.tasks_completed')}
        />
      </div>

      {/* Task completion rate */}
      <div className="profile-rate-card">
        <div className="profile-rate-card__top">
          <span className="profile-rate-card__label">{t('profile.tasks_rate_title')}</span>
          <span className="profile-rate-card__pct">{taskRate}%</span>
        </div>
        <div className="profile-goal-bar">
          <div
            className="profile-goal-fill profile-goal-fill--green"
            style={{ width: `${taskRate}%` }}
          />
        </div>
        <p className="profile-rate-card__hint">
          {t('profile.tasks_rate_hint', { completed: user.tasksCompleted, total: user.tasksTotal })}
        </p>
      </div>

      {/* Edit modal */}
      {isModalOpen && (
        <EditModal
          initial={editInitial}
          onSave={handleSave}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </section>
  );
};

export default ProfilePage;