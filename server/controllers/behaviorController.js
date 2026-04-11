import pool from '../db/pool.js';

const ALLOWED = ['skip', 'quit', 'delay'];

export async function logBehavior(req, res, next) {
  try {
    const { action_type, task_id = null, timestamp } = req.body;
    if (!ALLOWED.includes(action_type)) {
      return res.status(400).json({ message: 'Неверный тип действия' });
    }

    await pool.query(
      `INSERT INTO user_behavior_logs (user_id, action_type, task_id, timestamp)
       VALUES ($1, $2, $3, $4)`,
      [req.userId, action_type, task_id, timestamp ?? new Date()]
    );
    res.status(204).end();
  } catch (err) { next(err); }
}