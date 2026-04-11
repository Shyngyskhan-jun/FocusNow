import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Заполни все поля' });
    }

    const exists = await pool.query(
      'SELECT id FROM users WHERE email = $1', [email]
    );
    if (exists.rows.length) {
      return res.status(409).json({ message: 'Email уже занят' });
    }

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3) RETURNING id, name`,
      [name, email, hash]
    );

    const user = rows[0];
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({ token, name: user.name });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Заполни все поля' });
    }

    const { rows } = await pool.query(
      'SELECT id, name, password_hash FROM users WHERE email = $1', [email]
    );
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ token, name: user.name });
  } catch (err) {
    next(err);
  }
}