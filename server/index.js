import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes from './routes/auth.js';
import tasksRoutes from './routes/tasks.js';
import focusRoutes from './routes/focus.js';
import behaviorRoutes from './routes/behavior.js';
import userRoutes from './routes/user.js';
import analyticsRoutes from './routes/analytics.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Список разрешенных адресов
const allowedOrigins = [
    'http://localhost:5173',   // Локальная разработка (Vite)
    'http://localhost',        // Android Capacitor (иногда)
    'https://localhost',       // Android/iOS Capacitor (основной)
    'capacitor://localhost',  // Стандарт Capacitor
    process.env.CLIENT_URL,    // Твой фронтенд на Vercel
].filter(Boolean);             // Удаляет пустые значения, если CLIENT_URL не задан

// app.use(cors({
//     origin: (origin, callback) => {
//         // Разрешаем запросы без origin (например, мобильные приложения или Postman)
//         if (!origin) {
//             return callback(null, true);
//         }

//         if (allowedOrigins.includes(origin)) {
//             callback(null, true);
//         } else {
//             console.log('Blocked by CORS:', origin); // Поможет увидеть в логах Railway, если кто-то еще заблокирован
//             callback(new Error('Not allowed by CORS'));
//         }
//     },
//     credentials: true,
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization']
// }));

app.use(cors({
    origin: true, // Автоматически разрешает тот origin, который делает запрос
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Маршруты
app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/focus', focusRoutes);
app.use('/api/behavior', behaviorRoutes);
app.use('/api/user', userRoutes);
app.use('/api/analytics', analyticsRoutes);

// Обработка ошибок (должна быть последней)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));