import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../services/api';
import '../styles/analysis.css';
//самая сложная страница емае
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

const formatTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  if (h && m) return `${h} ч ${m} мин`;
  if (h) return `${h} ч`;
  return `${m} мин`;
};

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Доброе утро';
  if (hour >= 12 && hour < 18) return 'Добрый день';
  if (hour >= 18 && hour < 23) return 'Добрый вечер';
  return 'Доброй ночи';
};

const getWeekDayLabel = (date: Date): string =>
  new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(date);

const getShortDateLabel = (date: Date): string =>
  new Intl.DateTimeFormat('ru-RU', {
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

const buildCoachMessage = (params: {
  overdue: number;
  active: number;
  completedToday: number;
  focusMinutesToday: number;
  streak: number;
}): CoachMessage => {
  const { overdue, active, completedToday, focusMinutesToday, streak } = params;

  if (overdue >= 3) {
    return {
      title: 'Сейчас тебя тормозит перегруз',
      text:
        'У тебя накопилось слишком много просрочки. Не пытайся закрыть всё сразу: выбери одну задачу, разбей её на 3 шага и начни с первого шага на 10–15 минут.',
    };
  }

  if (active >= 6 && focusMinutesToday < 45) {
    return {
      title: 'Слишком много задач — слишком мало фокуса',
      text:
        'Похоже, список слишком длинный, а фокус-сессий мало. Оставь 1–3 задачи на сегодня, остальные перенеси. Так мозг меньше саботирует старт.',
    };
  }

  if (completedToday === 0) {
    return {
      title: 'Ноль выполненных задач сегодня — нужен лёгкий старт',
      text:
        'Начни с самой простой задачи. Не с “важной”, а с той, которую реально закрыть быстро. После первого завершения прокрастинация обычно заметно падает.',
    };
  }

  if (focusMinutesToday < 60) {
    return {
      title: 'Нужно чуть больше фокус-циклов',
      text:
        'У тебя уже есть движение, но для стабильного прогресса не хватает времени в фокусе. Попробуй ещё 1–2 коротких цикла без отвлечений.',
    };
  }

  if (streak >= 3) {
    return {
      title: 'Хороший ритм уже есть',
      text:
        'Ты держишь серию несколько дней подряд. Главное сейчас — не ломать темп: один короткий фокус-цикл в день лучше, чем идеальный план, который не запускается.',
    };
  }

  return {
    title: 'Нормальный день, но есть куда усилить ритм',
    text:
      'Держи ставку на маленькие шаги, короткие циклы и один понятный приоритет. Так проще не застревать на старте.',
  };
};

const AnalysisPage: React.FC = () => {
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
          error: 'Не удалось загрузить данные для анализа',
        }));
      }
    };

    load();

    return () => {
      alive = false;
    };
  }, []);

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

    const coach = buildCoachMessage({
      overdue: overdueTasks,
      active: activeTasks,
      completedToday,
      focusMinutesToday,
      streak,
    });

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
      reasons.push('Есть просроченные задачи, и они давят на старт');
    }
    if (activeTasks >= 6) {
      reasons.push('Слишком длинный список задач перегружает внимание');
    }
    if (focusMinutesToday < 45) {
      reasons.push('Сегодня пока мало времени в фокусе');
    }
    if (streak === 0) {
      reasons.push('Нет стабильной серии дней подряд');
    }

    if (!reasons.length) {
      reasons.push('Сейчас нагрузка выглядит умеренной');
    }

    const recommendations = [
      'Выбери одну задачу на ближайшие 15 минут.',
      'Разбей её на 3 очень маленьких шага.',
      'Запусти короткий Pomodoro без лишних вкладок.',
      'После цикла отметь результат и сделай паузу на 2–3 минуты.',
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
  }, [state.focusStats, state.tasks]);

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
        label: getWeekDayLabel(date),
        dateLabel: getShortDateLabel(date),
        value,
        percent,
      };
    });
  }, [state.focusStats]);

  if (state.loading) {
    return <p className="empty-state">Загрузка анализа...</p>;
  }

  return (
    <section className="analysis-page container">
      <div className="analysis-hero card">
        <div>
          <span className="section-label">AI analysis</span>
          <h1>{getGreeting()}, это твой анализ продуктивности</h1>
          <p className="analysis-hero__text">
            Страница смотрит на задачи, фокус и прогресс, чтобы подсказать, где ты
            буксуешь и что сделать прямо сейчас без лишней воды.
          </p>
        </div>

        <div className="analysis-hero__actions">
          <Link to="/tasks" className="btn btn--primary">
            Перейти к задачам
          </Link>
          <Link to="/focus" className="btn btn--outline">
            Запустить фокус
          </Link>
        </div>
      </div>

      {state.error && <div className="analysis-error">{state.error}</div>}

      <div className="analysis-metrics">
        <article className="analysis-metric card">
          <span className="analysis-metric__value">{analysis.completionRate}%</span>
          <p>выполнено из всех задач</p>
        </article>

        <article className="analysis-metric card">
          <span className="analysis-metric__value">{analysis.overdueTasks}</span>
          <p>просрочено</p>
        </article>

        <article className="analysis-metric card">
          <span className="analysis-metric__value">
            {formatTime(analysis.focusMinutesToday)}
          </span>
          <p>в фокусе сегодня</p>
        </article>

        <article className="analysis-metric card">
          <span className="analysis-metric__value">{analysis.streak}</span>
          <p>дней подряд</p>
        </article>
      </div>

      <div className="analysis-grid">
        <div className="analysis-main">
          <section className="card analysis-coach">
            <div className="analysis-coach__top">
              <div>
                <span className="section-label">AI assistant</span>
                <h2>{analysis.coach.title}</h2>
              </div>

              <div className={`analysis-risk analysis-risk--${analysis.riskLevel}`}>
                Риск: {analysis.riskLevel === 'high' ? 'Высокий' : analysis.riskLevel === 'medium' ? 'Средний' : 'Низкий'}
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
                <span className="section-label">7 дней</span>
                <h2>Фокус за неделю</h2>
              </div>
              <p>Где у тебя был реальный режим, а где проседал темп.</p>
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
                    {formatTime(bar.value)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card analysis-patterns">
            <div className="analysis-section-head">
              <div>
                <span className="section-label">Слабые места</span>
                <h2>Что мешает сейчас</h2>
              </div>
              <p>Эти сигналы собраны из задач, фокуса и текущей нагрузки.</p>
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
            <span className="section-label">Сводка</span>
            <h3>Текущие цифры</h3>

            <div className="analysis-side-list">
              <div className="analysis-side-item">
                <span>Активные задачи</span>
                <strong>{analysis.activeTasks}</strong>
              </div>

              <div className="analysis-side-item">
                <span>Выполненные задачи</span>
                <strong>{analysis.completedTasks}</strong>
              </div>

              <div className="analysis-side-item">
                <span>Фокус за неделю</span>
                <strong>{formatTime(analysis.focusMinutesWeek)}</strong>
              </div>

              <div className="analysis-side-item">
                <span>Прогресс цели на сегодня</span>
                <strong>{analysis.dailyGoalProgress}%</strong>
              </div>

              <div className="analysis-side-item">
                <span>Лучший час активности</span>
                <strong>{analysis.peakHour ?? 'Пока мало данных'}</strong>
              </div>
            </div>
          </section>

          <section className="card analysis-side-card analysis-today-plan">
            <span className="section-label">План на сейчас</span>
            <h3>Против прокрастинации</h3>

            <div className="analysis-plan">
              <div className="analysis-plan__item">
                1. Оставь только одну главную задачу.
              </div>
              <div className="analysis-plan__item">
                2. Поставь таймер на 15 минут.
              </div>
              <div className="analysis-plan__item">
                3. После цикла закрой вкладку с отвлечениями.
              </div>
              <div className="analysis-plan__item">
                4. Отметь результат в задачах и продолжай.
              </div>
            </div>

            <div className="analysis-side-actions">
              <Link to="/tasks" className="btn btn--primary btn--block">
                Открыть задачи
              </Link>
              <Link to="/focus" className="btn btn--ghost btn--block">
                Начать таймер
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
};

export default AnalysisPage;