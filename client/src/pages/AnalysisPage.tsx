import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../services/api';
import '../styles/analysis.css';

interface Task {
  id: string;
  title?: string;
  completed?: boolean;
  status?: string;
  deadline?: string | null;
  due_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  completed_at?: string | null;
}

interface DailyStat {
  date: string;
  total_minutes: string | number;
}

interface FocusStatsResponse {
  dailyStats?: DailyStat[];
}

interface AnalysisState {
  tasks: Task[];
  focusStats: DailyStat[];
  loading: boolean;
  error: string;
}

interface CoachMessage {
  title: string;
  text: string;
}

type RiskLevel = 'high' | 'medium' | 'low';

const DAILY_GOAL_MINUTES = 120;

const parseMinutes = (value: unknown): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const isSameDay = (a: Date, b: Date): boolean =>
  a.toDateString() === b.toDateString();

const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const isTaskCompleted = (task: Task): boolean =>
  Boolean(task.completed || task.status === 'completed' || task.completed_at);

const getTaskDate = (task: Task): string | null =>
  task.deadline ?? task.due_date ?? task.updated_at ?? task.created_at ?? null;

const isTaskOverdue = (task: Task, today: Date): boolean => {
  if (isTaskCompleted(task)) return false;

  const rawDate = getTaskDate(task);
  if (!rawDate) return false;

  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return false;

  return date.getTime() < startOfDay(today).getTime();
};

const formatTime = (minutes: number, hStr: string, mStr: string): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  if (h && m) return `${h} ${hStr} ${m} ${mStr}`;
  if (h) return `${h} ${hStr}`;
  return `${m} ${mStr}`;
};

const getGreetingKey = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'greeting.morning';
  if (hour >= 12 && hour < 18) return 'greeting.afternoon';
  if (hour >= 18 && hour < 23) return 'greeting.evening';
  return 'greeting.night';
};

const getWeekDayLabel = (date: Date, lang: string): string =>
  new Intl.DateTimeFormat(lang, { weekday: 'short' }).format(date);

const getShortDateLabel = (date: Date, lang: string): string =>
  new Intl.DateTimeFormat(lang, {
    day: '2-digit',
    month: '2-digit',
  }).format(date);

const calculateStreak = (dailyStats: DailyStat[]): number => {
  if (!dailyStats.length) return 0;

  const map = new Map<string, number>();
  for (const item of dailyStats) {
    const dateKey = new Date(item.date).toDateString();
    map.set(dateKey, parseMinutes(item.total_minutes));
  }

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (true) {
    const key = cursor.toDateString();
    const value = map.get(key) ?? 0;
    if (value <= 0) break;

    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

const getPeakHour = (tasks: Task[]): string | null => {
  const buckets = new Map<number, number>();

  for (const task of tasks) {
    const raw = task.created_at ?? task.updated_at ?? task.completed_at;
    if (!raw) continue;

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) continue;

    const hour = date.getHours();
    buckets.set(hour, (buckets.get(hour) ?? 0) + 1);
  }

  if (!buckets.size) return null;

  let bestHour = 0;
  let bestCount = 0;

  for (const [hour, count] of buckets.entries()) {
    if (count > bestCount) {
      bestCount = count;
      bestHour = hour;
    }
  }

  return `${String(bestHour).padStart(2, '0')}:00–${String(bestHour).padStart(2, '0')}:59`;
};

const getCoachMessageKeys = (params: {
  overdue: number;
  active: number;
  completedToday: number;
  focusMinutesToday: number;
  streak: number;
}) => {
  const { overdue, active, completedToday, focusMinutesToday, streak } = params;

  if (overdue >= 3) {
    return { titleKey: 'coach.overdue.title', textKey: 'coach.overdue.text' };
  }
  if (active >= 6 && focusMinutesToday < 45) {
    return { titleKey: 'coach.heavy_load.title', textKey: 'coach.heavy_load.text' };
  }
  if (completedToday === 0) {
    return { titleKey: 'coach.zero_completed.title', textKey: 'coach.zero_completed.text' };
  }
  if (focusMinutesToday < 60) {
    return { titleKey: 'coach.low_focus.title', textKey: 'coach.low_focus.text' };
  }
  if (streak >= 3) {
    return { titleKey: 'coach.streak.title', textKey: 'coach.streak.text' };
  }
  return { titleKey: 'coach.default.title', textKey: 'coach.default.text' };
};

const AnalysisPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  const [state, setState] = useState<AnalysisState>({
    tasks: [],
    focusStats: [],
    loading: true,
    error: '',
  });

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const [tasks, focus] = await Promise.all([
          apiFetch<Task[]>('/tasks'),
          apiFetch<FocusStatsResponse>('/focus/stats'),
        ]);

        if (!alive) return;

        setState({
          tasks: tasks ?? [],
          focusStats: focus?.dailyStats ?? [],
          loading: false,
          error: '',
        });
      } catch {
        if (!alive) return;

        setState(prev => ({
          ...prev,
          loading: false,
          error: t('analysis.error'),
        }));
      }
    };

    load();

    return () => {
      alive = false;
    };
  }, [t]);

  const analysis = useMemo(() => {
    const today = new Date();

    const tasks = state.tasks ?? [];
    const focusStats = state.focusStats ?? [];

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(isTaskCompleted).length;
    const activeTasks = tasks.filter(task => !isTaskCompleted(task)).length;
    const overdueTasks = tasks.filter(task => isTaskOverdue(task, today)).length;

    const todayStat = focusStats.find(item =>
      isSameDay(new Date(item.date), today)
    );

    const focusMinutesToday = parseMinutes(todayStat?.total_minutes);
    const focusMinutesWeek = focusStats.reduce(
      (sum, item) => sum + parseMinutes(item.total_minutes),
      0
    );

    const streak = calculateStreak(focusStats);
    const peakHour = getPeakHour(tasks);
    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const dailyGoalProgress = Math.min(
      100,
      Math.round((focusMinutesToday / DAILY_GOAL_MINUTES) * 100)
    );

    const completedToday = tasks.filter(task => {
      if (!isTaskCompleted(task) || !task.updated_at) return false;
      return isSameDay(new Date(task.updated_at), today);
    }).length;

    const { titleKey, textKey } = getCoachMessageKeys({
      overdue: overdueTasks,
      active: activeTasks,
      completedToday,
      focusMinutesToday,
      streak,
    });

    const coach: CoachMessage = {
      title: t(titleKey),
      text: t(textKey),
    };

    const riskScore = Math.min(
      100,
      Math.round(
        overdueTasks * 22 +
          activeTasks * 6 +
          Math.max(0, 60 - focusMinutesToday) * 0.7 +
          Math.max(0, 3 - streak) * 8
      )
    );

    const riskLevel: RiskLevel =
      riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low';

    const reasons: string[] = [];

    if (overdueTasks > 0) {
      reasons.push(t('reason.overdue'));
    }
    if (activeTasks >= 6) {
      reasons.push(t('reason.too_many_tasks'));
    }
    if (focusMinutesToday < 45) {
      reasons.push(t('reason.low_focus'));
    }
    if (streak === 0) {
      reasons.push(t('reason.no_streak'));
    }

    if (!reasons.length) {
      reasons.push(t('reason.moderate_load'));
    }

    const recommendations = [
      t('recommendation.step_1'),
      t('recommendation.step_2'),
      t('recommendation.step_3'),
      t('recommendation.step_4'),
    ];

    return {
      totalTasks,
      completedTasks,
      activeTasks,
      overdueTasks,
      focusMinutesToday,
      focusMinutesWeek,
      streak,
      completionRate,
      dailyGoalProgress,
      peakHour,
      coach,
      riskScore,
      riskLevel,
      reasons,
      recommendations,
    };
  }, [state.focusStats, state.tasks, t]);

  const weeklyBars = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const map = new Map<string, number>();
    for (const item of state.focusStats) {
      const date = new Date(item.date);
      if (Number.isNaN(date.getTime())) continue;
      map.set(date.toDateString(), parseMinutes(item.total_minutes));
    }

    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);

      const value = map.get(date.toDateString()) ?? 0;
      const percent = Math.min(
        100,
        Math.round((value / DAILY_GOAL_MINUTES) * 100)
      );

      return {
        label: getWeekDayLabel(date, currentLang),
        dateLabel: getShortDateLabel(date, currentLang),
        value,
        percent,
      };
    });
  }, [state.focusStats, currentLang]);

  if (state.loading) {
    return <p className="empty-state">{t('analysis.loading')}</p>;
  }

  return (
    <section className="analysis-page container">
      <div className="analysis-hero card">
        <div>
          <span className="section-label">{t('analysis.hero.label')}</span>
          <h1>{t('analysis.hero.title', { greeting: t(getGreetingKey()) })}</h1>
          <p className="analysis-hero__text">
            {t('analysis.hero.text')}
          </p>
        </div>

        <div className="analysis-hero__actions">
          <Link to="/tasks" className="btn btn--primary">
            {t('analysis.hero.btn_tasks')}
          </Link>
          <Link to="/focus" className="btn btn--outline">
            {t('analysis.hero.btn_focus')}
          </Link>
        </div>
      </div>

      {state.error && <div className="analysis-error">{state.error}</div>}

      <div className="analysis-metrics">
        <article className="analysis-metric card">
          <span className="analysis-metric__value">{analysis.completionRate}%</span>
          <p>{t('analysis.metric.completion_rate')}</p>
        </article>

        <article className="analysis-metric card">
          <span className="analysis-metric__value">{analysis.overdueTasks}</span>
          <p>{t('analysis.metric.overdue')}</p>
        </article>

        <article className="analysis-metric card">
          <span className="analysis-metric__value">
            {formatTime(analysis.focusMinutesToday, t('time.hours_short'), t('time.minutes_short'))}
          </span>
          <p>{t('analysis.metric.focus_today')}</p>
        </article>

        <article className="analysis-metric card">
          <span className="analysis-metric__value">{analysis.streak}</span>
          <p>{t('analysis.metric.streak')}</p>
        </article>
      </div>

      <div className="analysis-grid">
        <div className="analysis-main">
          <section className="card analysis-coach">
            <div className="analysis-coach__top">
              <div>
                <span className="section-label">{t('analysis.coach.label')}</span>
                <h2>{analysis.coach.title}</h2>
              </div>

              <div className={`analysis-risk analysis-risk--${analysis.riskLevel}`}>
                {t('analysis.coach.risk', { level: t(`analysis.risk.${analysis.riskLevel}`) })}
              </div>
            </div>

            <p className="analysis-coach__text">{analysis.coach.text}</p>

            <div className="analysis-step-list">
              {analysis.recommendations.map(step => (
                <div key={step} className="analysis-step">
                  {step}
                </div>
              ))}
            </div>
          </section>

          <section className="card analysis-chart">
            <div className="analysis-section-head">
              <div>
                <span className="section-label">{t('analysis.chart.label')}</span>
                <h2>{t('analysis.chart.title')}</h2>
              </div>
              <p>{t('analysis.chart.text')}</p>
            </div>

            <div className="analysis-bars">
              {weeklyBars.map(bar => (
                <div
                  key={`${bar.label}-${bar.dateLabel}`}
                  className="analysis-bar-row"
                >
                  <div className="analysis-bar-row__meta">
                    <strong>{bar.label}</strong>
                    <span>{bar.dateLabel}</span>
                  </div>

                  <div className="analysis-bar">
                    <div
                      className="analysis-bar__fill"
                      style={{ width: `${bar.percent}%` }}
                    />
                  </div>

                  <div className="analysis-bar-row__value">
                    {formatTime(bar.value, t('time.hours_short'), t('time.minutes_short'))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card analysis-patterns">
            <div className="analysis-section-head">
              <div>
                <span className="section-label">{t('analysis.patterns.label')}</span>
                <h2>{t('analysis.patterns.title')}</h2>
              </div>
              <p>{t('analysis.patterns.text')}</p>
            </div>

            <div className="analysis-pills">
              {analysis.reasons.map(reason => (
                <div key={reason} className="analysis-pill">
                  {reason}
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="analysis-side">
          <section className="card analysis-side-card">
            <span className="section-label">{t('analysis.summary.label')}</span>
            <h3>{t('analysis.summary.title')}</h3>

            <div className="analysis-side-list">
              <div className="analysis-side-item">
                <span>{t('analysis.summary.active_tasks')}</span>
                <strong>{analysis.activeTasks}</strong>
              </div>

              <div className="analysis-side-item">
                <span>{t('analysis.summary.completed_tasks')}</span>
                <strong>{analysis.completedTasks}</strong>
              </div>

              <div className="analysis-side-item">
                <span>{t('analysis.summary.focus_week')}</span>
                <strong>{formatTime(analysis.focusMinutesWeek, t('time.hours_short'), t('time.minutes_short'))}</strong>
              </div>

              <div className="analysis-side-item">
                <span>{t('analysis.summary.goal_progress')}</span>
                <strong>{analysis.dailyGoalProgress}%</strong>
              </div>

              <div className="analysis-side-item">
                <span>{t('analysis.summary.peak_hour')}</span>
                <strong>{analysis.peakHour ?? t('analysis.summary.no_data')}</strong>
              </div>
            </div>
          </section>

          <section className="card analysis-side-card analysis-today-plan">
            <span className="section-label">{t('analysis.plan.label')}</span>
            <h3>{t('analysis.plan.title')}</h3>

            <div className="analysis-plan">
              <div className="analysis-plan__item">
                {t('analysis.plan.step_1')}
              </div>
              <div className="analysis-plan__item">
                {t('analysis.plan.step_2')}
              </div>
              <div className="analysis-plan__item">
                {t('analysis.plan.step_3')}
              </div>
              <div className="analysis-plan__item">
                {t('analysis.plan.step_4')}
              </div>
            </div>

            <div className="analysis-side-actions">
              <Link to="/tasks" className="btn btn--primary btn--block">
                {t('analysis.plan.btn_open_tasks')}
              </Link>
              <Link to="/focus" className="btn btn--ghost btn--block">
                {t('analysis.plan.btn_start_timer')}
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
};

export default AnalysisPage;