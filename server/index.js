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
let initializationError = null;

// Настройка CORS (с максимальным доступом для отладки)
app.use(cors({
    origin: true, 
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());

app.use(express.json());

// Оборачиваем подключение роутов в try/catch. 
// Если внутри файлов routes/auth.js или других файлов при старте падает база данных, 
// этот блок перехватит ошибку и не даст серверу умереть.
try {
    // Маршруты
    app.use('/api/auth', authRoutes);
    app.use('/api/tasks', tasksRoutes);
    app.use('/api/focus', focusRoutes);
    app.use('/api/behavior', behaviorRoutes);
    app.use('/api/user', userRoutes);
    app.use('/api/analytics', analyticsRoutes);
    
    // Тестовый роут, чтобы проверить жив ли сервер вообще
    app.get('/', (req, res) => {
        res.send('Server is alive and running!');
    });

} catch (error) {
    initializationError = error;
    console.error("Критическая ошибка при инициализации роутов/БД:", error);
}

// Обработка ошибок (должна быть последней)
app.use(errorHandler);

// Перехватчик фатальной ошибки старта
app.all('*', (req, res, next) => {
    if (initializationError) {
        return res.status(500).json({
            message: "Сервер упал при старте приложения внутри модулей!",
            error: initializationError.message,
            stack: initializationError.stack
        });
    }
    next();
});

// Запуск сервера
const PORT = process.env.PORT || 8080; // Если Railway дает свой порт, берем его, иначе 8080
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});