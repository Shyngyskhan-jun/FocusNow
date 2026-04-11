import React, { useEffect, useMemo, useState } from "react";
import { useStatistics } from "../hooks/useStatistics";
import { formatMinutes } from "../utils/formatTime";
import { getDateKey } from "../utils/formatDate";
import type { BestResult } from "../types/stats";
import "../styles/stats.css";

const StatsPage: React.FC = () => {
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
        d.toLocaleDateString("ru-RU", { weekday: "short" })
      ),
      weekData: days.map((d) => dailyMap.get(getDateKey(d)) ?? 0),
    };
  }, [dailyMap]);

  const bestResults: BestResult[] = useMemo(
    () =>
      [...daily]
        .sort((a, b) => b.minutes - a.minutes)
        .slice(0, 3)
        .map((d, i) => ({
          id: String(i),
          date: d.date.toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          durationMinutes: d.minutes,
        })),
    [daily]
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
        <p className="empty-state">Анализируем вашу продуктивность...</p>
      </section>
    );
  }

  return (
    <section className="stats-page">
      <header className="stats-header">
        <div>
          <p className="section-label">Аналитика</p>
          <h1 className="stats-title">Статистика</h1>
          <p className="stats-subtitle">Анализируй свою продуктивность</p>
        </div>
        <div className="stats-header__badge">
          {currentStreak > 0
            ? `🔥 ${currentStreak} дней подряд`
            : "Начни серию сегодня"}
        </div>
      </header>

      <div className="card stats-overview">
        <div className="stats-overview__row">
          <div className="stats-overview__item">
            <span className="stats-overview__value">{formatMinutes(todayMinutes)}</span>
            <span className="stats-overview__label">сегодня в фокусе</span>
          </div>
          <div className="stats-overview__item">
            <span className="stats-overview__value">{activeDays}</span>
            <span className="stats-overview__label">активных дней</span>
          </div>
          <div className="stats-overview__item">
            <span className="stats-overview__value">{formatMinutes(bestDay)}</span>
            <span className="stats-overview__label">лучший день</span>
          </div>
        </div>
      </div>

      <div className="card week-stats-card">
        <div className="card-head">
          <h3 className="section-title">Последние 7 дней</h3>
          <span className="badge">Фокус по дням</span>
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
            <span className="summary-label">За неделю:</span>
            <span className="summary-value">{formatMinutes(totalWeekMinutes)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">В среднем:</span>
            <span className="summary-value">{formatMinutes(avgWeekMinutes)}</span>
          </div>
        </div>
      </div>

      <div className="stats-grid-2-col">
        <div className="card streak-card">
          <div className="streak-icon">🔥</div>
          <div className="streak-number">{currentStreak}</div>
          <div className="streak-label">дней подряд</div>
          <div className="streak-subtext">
            {currentStreak > 0 ? "Отличный темп!" : "Начни серию сегодня!"}
          </div>
        </div>

        <div className="card best-results-card">
          <div className="card-head">
            <h3 className="section-title">Лучшие дни</h3>
            <span className="badge">Топ 3</span>
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
            <p className="empty-state">Здесь появятся ваши рекорды</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default StatsPage;