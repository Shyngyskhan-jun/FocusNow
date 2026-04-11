import pool from '../db/pool.js';

export async function getTasks(req, res, next) {
  try {
    const { rows: tasks } = await pool.query(
      `SELECT id, text, priority, completed, deadline, mood_before,
              created_at, updated_at
       FROM tasks WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.userId]
    );

    const { rows: steps } = await pool.query(
      `SELECT ts.id, ts.task_id, ts.text, ts.done
       FROM task_steps ts
       JOIN tasks t ON t.id = ts.task_id
       WHERE t.user_id = $1`,
      [req.userId]
    );

    const result = tasks.map(task => ({
      ...task,
      steps: steps.filter(s => s.task_id === task.id),
    }));

    res.json(result);
  } catch (err) { next(err); }
}

export async function createTask(req, res, next) {
  try {
    const { text, priority = 'medium', deadline = null, mood_before = null } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ message: 'Текст задачи обязателен' });
    }

    const { rows } = await pool.query(
      `INSERT INTO tasks (user_id, text, priority, deadline, mood_before)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, text, priority, completed, deadline, mood_before, created_at, updated_at`,
      [req.userId, text.trim(), priority, deadline, mood_before]
    );

    res.status(201).json({ ...rows[0], steps: [] });
  } catch (err) { next(err); }
}

export async function updateTask(req, res, next) {
  try {
    const { id } = req.params;
    const { completed, text, priority, deadline } = req.body;

    const { rows } = await pool.query(
      `UPDATE tasks
       SET completed = COALESCE($1, completed),
           text      = COALESCE($2, text),
           priority  = COALESCE($3, priority),
           deadline  = COALESCE($4, deadline)
       WHERE id = $5 AND user_id = $6
       RETURNING id, text, priority, completed, deadline, mood_before, updated_at`,
      [completed, text, priority, deadline, id, req.userId]
    );

    if (!rows.length) return res.status(404).json({ message: 'Задача не найдена' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

export async function deleteTask(req, res, next) {
  try {
    await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    res.status(204).end();
  } catch (err) { next(err); }
}

export async function addStep(req, res, next) {
  try {
    const { taskId } = req.params;
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Текст шага обязателен' });

    // проверяем что задача принадлежит пользователю
    const taskCheck = await pool.query(
      'SELECT id FROM tasks WHERE id = $1 AND user_id = $2',
      [taskId, req.userId]
    );
    if (!taskCheck.rows.length) return res.status(404).json({ message: 'Задача не найдена' });

    const { rows } = await pool.query(
      'INSERT INTO task_steps (task_id, text) VALUES ($1, $2) RETURNING id, text, done',
      [taskId, text.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
}

export async function toggleStep(req, res, next) {
  try {
    const { taskId, stepId } = req.params;

    await pool.query(
      `UPDATE task_steps SET done = NOT done
       WHERE id = $1 AND task_id = $2`,
      [stepId, taskId]
    );
    res.status(204).end();
  } catch (err) { next(err); }
}