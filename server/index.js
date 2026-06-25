import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// 1. МГНОВЕННО включаем CORS и OPTIONS, чтобы браузер всегда получал заголовки
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());
app.use(express.json());

// Базовый тестовый роут, доступный ВСЕГДА
app.get('/', (req, res) => {
    res.send('Если ты видишь это, значит сеть и порты на Railway работают идеально!');
});

// 2. Оборачиваем импорты роутов и логику в динамический try/catch
async function initializeRoutes() {
    try {
        // Динамически импортируем роуты, чтобы их падение не тушило сервер при старте
        const authRoutes = await import('./routes/auth.js');
        const tasksRoutes = await import('./routes/tasks.js');
        const focusRoutes = await import('./routes/focus.js');
        const behaviorRoutes = await import('./routes/behavior.js');
        const userRoutes = await import('./routes/user.js');
        const analyticsRoutes = await import('./routes/analytics.js');
        const { errorHandler } = await import('./middleware/errorHandler.js');

        app.use('/api/auth', authRoutes.default);
        app.use('/api/tasks', tasksRoutes.default);
        app.use('/api/focus', focusRoutes.default);
        app.use('/api/behavior', behaviorRoutes.default);
        app.use('/api/user', userRoutes.default);
        app.use('/api/analytics', analyticsRoutes.default);

        app.use(errorHandler);
        console.log('Все роуты успешно подключены!');
    } catch (error) {
        console.error('КРИТИЧЕСКАЯ ОШИБКА ИНИЦИАЛИЗАЦИИ РОУТОВ:', error);
        
        // Перехватываем ошибку и выводим её на любой запрос к API
        app.use('/api/*', (req, res) => {
            res.status(500).json({
                message: "Сервер запущен, но модули или база данных упали при загрузке!",
                error: error.message,
                stack: error.stack
            });
        });
    }
}

// 3. СНАЧАЛА ЗАПУСКАЕМ СЕРВЕР (открываем порт), а потом подгружаем логику
app.listen(PORT, async () => {
    console.log(`Server strictly running on port ${PORT}`);
    await initializeRoutes();
});