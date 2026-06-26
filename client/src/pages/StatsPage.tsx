import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useStatistics } from "../hooks/useStatistics";
import { formatMinutes } from "../utils/formatTime";
import { getDateKey } from "../utils/formatDate";
import type { BestResult } from "../types/stats";
import "../styles/stats.css";

const StatsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language; // Передаем 'ru-RU' или 'en-US' динамически в форматирование дат

  const { daily, dailyMap, isLoading, currentStreak, todayMinutes, activeDays, bestDay } =
    useStatistics();

  const { weekData, weekLabels } = useMemo(() => {
    const days: Date[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    return {
      weekLabels: days.map((d) =>
        d.toLocaleDateString(currentLang, { weekday: "short" })
      ),
      weekData: days.map((d) => dailyMap.get(getDateKey(d)) ?? 0),
    };
  }, [dailyMap, currentLang]);

  const bestResults: BestResult[] = useMemo(
    () =>
      [...daily]
        .sort((a, b) => b.minutes - a.minutes)
        .slice(0, 3)
        .map((d, i) => ({
          id: String(i),
          date: d.date.toLocaleDateString(currentLang, {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          durationMinutes: d.minutes,
        })),
    [daily, currentLang]
  );

  const totalWeekMinutes = useMemo(
    () => weekData.reduce((sum, v) => sum + v, 0),
    [weekData]
  );

  const avgWeekMinutes = Math.round(totalWeekMinutes / 7);
  const maxWeekMinutes = Math.max(...weekData, 1);

  if (isLoading) {
    return (
      <section className="stats-page">
        <p className="empty-state">{t("stats.loading")}</p>
      </section>
    );
  }

  return (
    <section className="stats-page">
      <header className="stats-header">
        <div>
          <p className="section-label">{t("stats.label")}</p>
          <h1 className="stats-title">{t("stats.title")}</h1>
          <p className="stats-subtitle">{t("stats.subtitle")}</p>
        </div>
        <div className="stats-header__badge">
          {currentStreak > 0
            ? t("stats.streak_active", { count: currentStreak })
            : t("stats.streak_inactive")}
        </div>
      </header>

      <div className="card stats-overview">
        <div className="stats-overview__row">
          <div className="stats-overview__item">
            <span className="stats-overview__value">{formatMinutes(todayMinutes)}</span>
            <span className="stats-overview__label">{t("stats.today_focus")}</span>
          </div>
          <div className="stats-overview__item">
            <span className="stats-overview__value">{activeDays}</span>
            <span className="stats-overview__label">{t("stats.active_days")}</span>
          </div>
          <div className="stats-overview__item">
            <span className="stats-overview__value">{formatMinutes(bestDay)}</span>
            <span className="stats-overview__label">{t("stats.best_day")}</span>
          </div>
        </div>
      </div>

      <div className="card week-stats-card">
        <div className="card-head">
          <h3 className="section-title">{t("stats.last_7_days")}</h3>
          <span className="badge">{t("stats.focus_by_days")}</span>
        </div>

        <div className="chart-container">
          {weekData.map((minutes, index) => (
            <div key={index} className="chart-column">
              <div className="chart-bar-bg">
                <div
                  className="chart-bar"
                  style={{
                    height: `${Math.round((minutes / maxWeekMinutes) * 100)}%`,
                    minHeight: minutes > 0 ? "4px" : "0",
                  }}
                  title={`${minutes} мин`}
                />
              </div>
              <div className="chart-label">{weekLabels[index]}</div>
            </div>
          ))}
        </div>

        <div className="stats-summary">
          <div className="summary-item">
            <span className="summary-label">{t("stats.total_week")}</span>
            <span className="summary-value">{formatMinutes(totalWeekMinutes)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">{t("stats.avg_week")}</span>
            <span className="summary-value">{formatMinutes(avgWeekMinutes)}</span>
          </div>
        </div>
      </div>

      <div className="stats-grid-2-col">
        <div className="card streak-card">
          <div className="streak-icon">🔥</div>
          <div className="streak-number">{currentStreak}</div>
          <div className="streak-label">{t("stats.streak_card_label")}</div>
          <div className="streak-subtext">
            {currentStreak > 0 ? t("stats.streak_tempo") : t("stats.streak_start_today")}
          </div>
        </div>

        <div className="card best-results-card">
          <div className="card-head">
            <h3 className="section-title">{t("stats.best_days_title")}</h3>
            <span className="badge">{t("stats.top_3")}</span>
          </div>
          {bestResults.length > 0 ? (
            <ul className="results-list">
              {bestResults.map((result, index) => (
                <li key={result.id} className="result-item">
                  <div className="result-rank">#{index + 1}</div>
                  <div className="result-info">
                    <div className="result-date">{result.date}</div>
                    <div className="result-duration">
                      {formatMinutes(result.durationMinutes)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">{t("stats.no_records")}</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default StatsPage;