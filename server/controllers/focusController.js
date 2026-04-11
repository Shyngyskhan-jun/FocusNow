import pool from '../db/pool.js';

export async function saveSession(req, res, next) {
  try {
    const { duration_minutes, mood_before, completed_at } = req.body;
    if (!duration_minutes || duration_minutes < 1) {
      return res.status(400).json({ message: 'Некорректная длительность' });
    }

    const { rows } = await pool.query(
      `INSERT INTO focus_sessions (user_id, duration_minutes, mood_before, completed_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, duration_minutes, mood_before, completed_at`,
      [req.userId, duration_minutes, mood_before ?? null, completed_at ?? new Date()]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
}

export async function getStats(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT DATE(completed_at) AS date,
              SUM(duration_minutes)::int AS total_minutes
       FROM focus_sessions
       WHERE user_id = $1
       GROUP BY DATE(completed_at)
       ORDER BY date DESC
       LIMIT 90`,
      [req.userId]
    );
    res.json({ dailyStats: rows });
  } catch (err) { next(err); }
}