import pool from '../db/pool.js';

export async function getProfile(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT name, email, occupation, bio, daily_goal_minutes, created_at
       FROM users WHERE id = $1`,
      [req.userId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Пользователь не найден' });

    const user = rows[0];

    // Статистика
    const [focusRes, tasksRes, streakRes] = await Promise.all([
      pool.query(
        'SELECT COALESCE(SUM(duration_minutes), 0)::int AS total FROM focus_sessions WHERE user_id = $1',
        [req.userId]
      ),
      pool.query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE completed = TRUE)::int AS completed
         FROM tasks WHERE user_id = $1`,
        [req.userId]
      ),
      pool.query(
        `SELECT DATE(completed_at) AS date
         FROM focus_sessions WHERE user_id = $1
         GROUP BY DATE(completed_at)
         ORDER BY date DESC`,
        [req.userId]
      ),
    ]);

    // Считаем стрики
    const dates = streakRes.rows.map(r => r.date.toISOString().split('T')[0]);
    let currentStreak = 0;
    let longestStreak = 0;
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    let checkDate = dates.includes(today) ? today : yesterday;

    for (let i = 0; i < dates.length; i++) {
      if (dates[i] === checkDate) {
        streak++;
        longestStreak = Math.max(longestStreak, streak);
        const prev = new Date(checkDate);
        prev.setDate(prev.getDate() - 1);
        checkDate = prev.toISOString().split('T')[0];
      } else break;
    }
    currentStreak = streak;

    res.json({
      name: user.name,
      email: user.email,
      joinedDate: user.created_at,
      occupation: user.occupation,
      bio: user.bio,
      dailyGoalMinutes: user.daily_goal_minutes,
      totalFocusMinutes: focusRes.rows[0].total,
      tasksTotal: tasksRes.rows[0].total,
      tasksCompleted: tasksRes.rows[0].completed,
      currentStreak,
      longestStreak,
    });
  } catch (err) { next(err); }
}

export async function updateProfile(req, res, next) {
  try {
    const { name, occupation, bio, dailyGoalMinutes } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Имя обязательно' });

    await pool.query(
      `UPDATE users
       SET name = $1, occupation = $2, bio = $3, daily_goal_minutes = $4
       WHERE id = $5`,
      [name.trim(), occupation, bio, dailyGoalMinutes, req.userId]
    );
    res.status(204).end();
  } catch (err) { next(err); }
}