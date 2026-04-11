import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { apiFetch } from '../services/api';
import '../styles/profile.css';

//типы

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

//константы

const OCCUPATION_OPTIONS: { value: Occupation; emoji: string; label: string }[] = [
  { value: 'pupil',      emoji: '🎒', label: 'Школьник' },
  { value: 'student',    emoji: '🎓', label: 'Студент' },
  { value: 'worker',     emoji: '💼', label: 'Работающий' },
  { value: 'freelancer', emoji: '💻', label: 'Фрилансер' },
  { value: 'other',      emoji: '✨', label: 'Другое' },
];

const DAILY_GOALS: { value: DailyGoalOption; label: string }[] = [
  { value: 60,  label: '1 час' },
  { value: 90,  label: '1.5 часа' },
  { value: 120, label: '2 часа' },
  { value: 180, label: '3 часа' },
  { value: 240, label: '4 часа' },
];

//Тут закончил

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

const formatFocusTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} ч ${m} м`;
  if (h) return `${h} ч`;
  return `${m} м`;
};

const getInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return (parts[0]?.[0] ?? '').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
};

const getOccupationLabel = (occ?: Occupation) => {
  if (!occ) return null;
  return OCCUPATION_OPTIONS.find(o => o.value === occ);
};

const getTaskRate = (completed: number, total: number) => {
  if (!total) return 0;
  return Math.round((completed / total) * 100);
};

//стата

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

//редактирование

const EditModal: React.FC<{
  initial: EditForm;
  onSave: (form: EditForm) => Promise<void>;
  onClose: () => void;
}> = ({ initial, onSave, onClose }) => {
  const [form, setForm] = useState<EditForm>(initial);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof EditForm>(key: K, value: EditForm[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Имя не может быть пустым'); return; }
    setIsSaving(true);
    setError('');
    try {
      await onSave({ ...form, name: form.name.trim() });
    } catch (e: any) {
      setError(e.message || 'Ошибка сохранения');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="profile-modal-backdrop" onClick={onClose}>
      <div className="profile-modal" onClick={e => e.stopPropagation()}>
        <div className="profile-modal__header">
          <h3 className="profile-modal__title">Редактировать профиль</h3>
          <button className="profile-modal__close" onClick={onClose} aria-label="Закрыть">✕</button>
        </div>

        {error && <div className="profile-modal__error">{error}</div>}

        {/* Name */}
        <div className="profile-field">
          <label className="profile-field__label">Имя</label>
          <input
            className="profile-field__input"
            type="text"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Твоё имя"
            autoFocus
            maxLength={60}
          />
        </div>

        {/* Occupation */}
        <div className="profile-field">
          <label className="profile-field__label">Род занятий</label>
          <div className="occupation-grid">
            {OCCUPATION_OPTIONS.map(({ value, emoji, label }) => (
              <button
                key={value}
                className={`occupation-btn ${form.occupation === value ? 'occupation-btn--active' : ''}`}
                onClick={() => set('occupation', value)}
                type="button"
              >
                <span>{emoji}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bio */}
        <div className="profile-field">
          <label className="profile-field__label">О себе <span className="profile-field__hint">(необязательно)</span></label>
          <textarea
            className="profile-field__input profile-field__textarea"
            value={form.bio}
            onChange={e => set('bio', e.target.value)}
            placeholder="Пара слов о себе, целях..."
            rows={3}
            maxLength={200}
          />
          <span className="profile-field__counter">{form.bio.length}/200</span>
        </div>

        {/* Daily goal */}
        <div className="profile-field">
          <label className="profile-field__label">Цель на день</label>
          <div className="goal-pills">
            {DAILY_GOALS.map(({ value, label }) => (
              <button
                key={value}
                className={`goal-pill ${form.dailyGoalMinutes === value ? 'goal-pill--active' : ''}`}
                onClick={() => set('dailyGoalMinutes', value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="profile-modal__footer">
          <button className="profile-btn profile-btn--ghost" onClick={onClose} disabled={isSaving}>
            Отмена
          </button>
          <button
            className="profile-btn profile-btn--primary"
            onClick={handleSave}
            disabled={isSaving || !form.name.trim()}
          >
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
};

//профиль

const ProfilePage: React.FC = () => {
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
      setError(e.message || 'Ошибка загрузки профиля');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const initials = useMemo(() => getInitials(user?.name ?? ''), [user?.name]);
  const joinedFormatted = useMemo(() => formatDate(user?.joinedDate ?? ''), [user?.joinedDate]);
  const occupationInfo = useMemo(() => getOccupationLabel(user?.occupation), [user?.occupation]);
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

  /* ── loading / error states ── */
  if (loading) {
    return (
      <section className="profile-page">
        <div className="profile-empty">
          <div className="profile-empty__icon">⏳</div>
          <p>Загрузка профиля...</p>
        </div>
      </section>
    );
  }

  if (error || !user) {
    return (
      <section className="profile-page">
        <div className="profile-empty profile-empty--error">
          <div className="profile-empty__icon">⚠️</div>
          <p>{error || 'Нет данных'}</p>
          <button className="profile-btn profile-btn--primary" onClick={fetchProfile}>
            Повторить
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="profile-page">
      {/* ── Header ── */}
      <header className="profile-page__header">
        <h1 className="profile-page__title">Профиль</h1>
        <p className="profile-page__sub">Аккаунт и персональная статистика</p>
      </header>

      {/* ── Identity card ── */}
      <div className="profile-identity-card">
        <div className="profile-avatar">
          {initials}
          <div className="profile-avatar__ring" />
        </div>

        <div className="profile-identity-info">
          <h2 className="profile-identity-name">{user.name || 'Без имени'}</h2>
          <p className="profile-identity-email">{user.email}</p>

          <div className="profile-identity-meta">
            {occupationInfo && (
              <span className="profile-meta-tag">
                {occupationInfo.emoji} {occupationInfo.label}
              </span>
            )}
            <span className="profile-meta-tag">
              📅 С {joinedFormatted}
            </span>
          </div>

          {user.bio && <p className="profile-bio">{user.bio}</p>}
        </div>

        <button
          className="profile-edit-btn"
          onClick={() => setIsModalOpen(true)}
          aria-label="Редактировать профиль"
        >
          ✏️ Изменить
        </button>
      </div>

      {/* ── Daily goal progress ── */}
      {user.dailyGoalMinutes && (
        <div className="profile-goal-card">
          <div className="profile-goal-card__top">
            <span className="profile-goal-card__label">Цель на день</span>
            <span className="profile-goal-card__value">
              {DAILY_GOALS.find(g => g.value === user.dailyGoalMinutes)?.label}
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

      {/* ── Stats ── */}
      <h3 className="profile-section-title">Достижения</h3>

      <div className="profile-stats-grid">
        <StatCard
          icon="⏱"
          value={formatFocusTime(user.totalFocusMinutes)}
          label="в фокусе всего"
        />
        <StatCard
          icon="🔥"
          value={user.currentStreak}
          label="дней подряд"
          accent
        />
        <StatCard
          icon="🏆"
          value={user.longestStreak}
          label="рекорд стрика"
        />
        <StatCard
          icon="✅"
          value={user.tasksCompleted}
          label="задач выполнено"
        />
      </div>

      {/* ── Task completion rate ── */}
      <div className="profile-rate-card">
        <div className="profile-rate-card__top">
          <span className="profile-rate-card__label">Процент выполнения задач</span>
          <span className="profile-rate-card__pct">{taskRate}%</span>
        </div>
        <div className="profile-goal-bar">
          <div
            className="profile-goal-fill profile-goal-fill--green"
            style={{ width: `${taskRate}%` }}
          />
        </div>
        <p className="profile-rate-card__hint">
          {user.tasksCompleted} из {user.tasksTotal} задач выполнено
        </p>
      </div>

      {/* ── Edit modal ── */}
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