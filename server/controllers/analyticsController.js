import pool from '../db/pool.js';

export async function getAnalytics(req, res, next) {
  try {
    const uid = req.userId;

    const [focusTotal, tasksRes, behaviorRes, moodRes] = await Promise.all([

      // Продуктивность по часам
      pool.query(
        `SELECT EXTRACT(HOUR FROM completed_at)::int AS hour,
                SUM(duration_minutes)::int AS score
         FROM focus_sessions WHERE user_id = $1
         GROUP BY hour ORDER BY hour`,
        [uid]
      ),

      // Задачи
      pool.query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE completed = TRUE)::int AS completed,
           COUNT(*) FILTER (WHERE completed = FALSE AND deadline < NOW())::int AS overdue,
           COALESCE(SUM(CASE WHEN completed = TRUE
             THEN EXTRACT(EPOCH FROM (updated_at - created_at))/60 END), 0)::int AS avg_mins
         FROM tasks WHERE user_id = $1`,
        [uid]
      ),

      // Поведенческие паттерны — прокрастинация по часам
      pool.query(
        `SELECT EXTRACT(HOUR FROM timestamp)::int AS hour,
                COUNT(*)::int AS count
         FROM user_behavior_logs
         WHERE user_id = $1 AND action_type IN ('delay', 'quit')
         GROUP BY hour ORDER BY hour`,
        [uid]
      ),

      // Настроение vs результат
      pool.query(
        `SELECT
           t.mood_before AS mood,
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE t.completed = TRUE)::int AS completed
         FROM tasks t
         WHERE t.user_id = $1 AND t.mood_before IS NOT NULL
         GROUP BY t.mood_before`,
        [uid]
      ),
    ]);

    const tasks = tasksRes.rows[0];

    const moodVsCompletion = moodRes.rows.map(row => ({
      mood: row.mood,
      completionRate: row.total > 0
        ? Math.round((row.completed / row.total) * 100)
        : 0,
    }));

    // Всего минут фокуса
    const totalFocusRes = await pool.query(
      'SELECT COALESCE(SUM(duration_minutes), 0)::int AS total FROM focus_sessions WHERE user_id = $1',
      [uid]
    );

    res.json({
      productivityByHour:   focusTotal.rows,
      procrastinationPeaks: behaviorRes.rows,
      moodVsCompletion,
      totalFocusMinutes:    totalFocusRes.rows[0].total,
      totalTasksCompleted:  tasks.completed,
      totalTasksOverdue:    tasks.overdue,
    });
  } catch (err) { next(err); }
}