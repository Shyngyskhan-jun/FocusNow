import fs from 'fs';
import path from 'path';
import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;

// Подключаемся к твоей БД (подтянет DATABASE_URL из .env)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    // Читаем файл init_db.sql, который лежит в корне проекта
    const sqlPath = path.join(process.cwd(), '../init_db.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Подключение к БД... Выполняю скрипт...');
    await pool.query(sql);
    console.log('🚀 Таблицы успешно созданы в твоем Railway!');
  } catch (err) {
    console.error('❌ Ошибка при создании таблиц:', err);
  } finally {
    await pool.end();
  }
}

run();