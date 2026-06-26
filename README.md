# FocusNow

Application against procrastination: tasks, Pomodoro timer, analytics.

## ENG

## Stack
Frontend: React 19, TypeScript, Vite, React Router
Backend: Node.js, Express, PostgreSQL, JWT
Mobile: Capacitor (in development)
## Run (local)
1. Database
Install PostgreSQL
Create database: CREATE DATABASE focusnow;
Run init_db.sql via pgAdmin or psql
2. Server
cd server cp .env.example .env # fill in the data npm install npm run dev # run on port 5000

3. The client
cd client cp .env.example .env # VITE_API_URL=http://localhost:5000/api npm install npm run dev # run on port 5173

## Structure of the project
client/ — React frontend server/ — Express API init_db.sql — SQL script for creating tables

## Deploy
Backend: Railway (environment variables from .env) Database: Railway PostgreSQL (DATABASE_URL) Frontend: Vercel or Railway

## RU

Приложение против прокрастинации: задачи, Pomodoro-таймер, аналитика.

## Стек
- Frontend: React 19, TypeScript, Vite, React Router
- Backend: Node.js, Express, PostgreSQL, JWT
- Mobile: Capacitor (в разработке)

## Запуск (локально)

### 1. База данных
- Установи PostgreSQL
- Создай базу: CREATE DATABASE focusnow;
- Выполни init_db.sql через pgAdmin или psql

### 2. Сервер
  cd server
  cp .env.example .env    # заполни своими данными
  npm install
  npm run dev             # запустится на порту 5000

### 3. Клиент
  cd client
  cp .env.example .env    # VITE_API_URL=http://localhost:5000/api
  npm install
  npm run dev             # запустится на порту 5173

## Структура проекта
  client/  — React фронтенд
  server/  — Express API
  init_db.sql — SQL-скрипт для создания таблиц

## Деплой
Backend: Railway (переменные окружения из .env)
Database: Railway PostgreSQL (DATABASE_URL)
Frontend: Vercel или Railway

developed by me as a team/collaboration project
