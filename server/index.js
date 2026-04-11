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

const allowedOrigins = [
    'http://localhost:5173',
    process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/focus', focusRoutes);
app.use('/api/behavior', behaviorRoutes);
app.use('/api/user', userRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use(errorHandler);

const PORT = process.env.PORT ?? 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));