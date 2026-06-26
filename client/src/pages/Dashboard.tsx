import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next"; // Импортируем хук перевода
import { apiFetch } from "../services/api";
import { formatMinutes, getGreeting } from "../utils/formatTime";
import { isSameDay } from "../utils/formatDate";
import { DAILY_GOAL_MINUTES } from "../utils/constants";
import type { Task } from "../types/task";
import type { FocusStatsResponse } from "../types/focus";
import "../styles/dashboard.css";

interface DashboardStats {
  focusMinutesToday: number;
  activeTasks: number;
  completedToday: number;
}

const parseMinutes = (val: unknown): number => {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
};

const Dashboard: React.FC = () => {
  const { t } = useTranslation(); // Инициализируем t()
  
  const [stats, setStats] = useState<DashboardStats>({
    focusMinutesToday: 0,
    activeTasks: 0,
    completedToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Если в localStorage нет имени, берем локализованную дефолтную строку "Студент" / "Student"
  const userName = localStorage.getItem("focusnow_user_name") ?? t("dashboard.user_default");

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const [tasks, focus] = await Promise.all([
          apiFetch<Task[]>("/tasks"),
          apiFetch<FocusStatsResponse>("/focus/stats"),
        ]);

        if (!alive) return;

        const today = new Date();
        const activeTasks = tasks.filter((t) => !t.completed).length;

        const completedToday = tasks.filter((t) => {
          if (!t.completed || !t.updated_at) return false;
          return isSameDay(new Date(t.updated_at), today);
        }).length;

        const todayStat = focus.dailyStats?.find((s) =>
          isSameDay(new Date(s.date), today)
        );

        setStats({
          focusMinutesToday: parseMinutes(todayStat?.total_minutes),
          activeTasks,
          completedToday,
        });
        setError("");
      } catch {
        if (alive) setError(t("dashboard.error_load")); // Локализованная ошибка
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => { alive = false; };
  }, [t]);

  const progress = Math.min(
    100,
    Math.round((stats.focusMinutesToday / DAILY_GOAL_MINUTES) * 100)
  );

  if (loading) return <p className="empty-state">{t("dashboard.loading")}</p>;

  return (
    <section className="dashboard">
      <div className="dashboard__top">
        <div>
          <h1>
            {/* Рендерим приветствие по динамическому ключу и подставляем имя */}
            {t(getGreeting())}, {userName} 👋
          </h1>
          <p className="muted">{t("dashboard.subtitle")}</p>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="focus-card">
        <div className="focus-time">{parseInt(formatMinutes(stats.focusMinutesToday), 10)} {t('minutes_short')}</div>
        <p className="muted">{t("dashboard.focus_today")}</p>

        <div className="progress">
          <div className="progress__fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="progress__text">
          {/* Передаем переменные для интерполяции в строку прогресса */}
          {t("dashboard.goal_text", { percent: progress, hours: DAILY_GOAL_MINUTES / 60 })}
        </span>
      </div>

      <div className="stats-grid">
        <div className="stat">
          <span>{stats.completedToday}</span>
          <p>{t("dashboard.completed_today")}</p>
        </div>
        <div className="stat">
          <span>{stats.activeTasks}</span>
          <p>{t("dashboard.active_tasks")}</p>
        </div>
      </div>

      <div className="actions">
        <Link to="/focus" className="btn btn--primary btn--block">
          {t("dashboard.btn_focus")}
        </Link>
        <Link to="/tasks" className="btn btn--outline btn--block">
          {t("dashboard.btn_tasks")}
        </Link>
      </div>
    </section>
  );
};

export default Dashboard;