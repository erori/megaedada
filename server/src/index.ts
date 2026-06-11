import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/environment';
import { redisService } from './services/redisService';
import { authHandler } from './handlers/authHandler';
import { lobbyHandler } from './handlers/lobbyHandler';
import { gameHandler } from './handlers/gameHandler';
import { reconnectHandler } from './handlers/reconnectHandler';

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.cors.origin,
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  transports: ['websocket', 'polling']
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  credentials: true
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // лимит 100 запросов с одного IP
  message: 'Слишком много запросов, попробуйте позже'
});
app.use('/api', limiter);

// Health check endpoint для Railway
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/auth', require('./routes/authRoutes'));

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Отправляем клиенту его socket ID
  socket.emit('connected', { socketId: socket.id });

  // Авторизация игрока
  socket.on('auth:login', (data) => authHandler.login(socket, data));
  socket.on('auth:register', (data) => authHandler.register(socket, data));
  socket.on('auth:token', (data) => authHandler.verifyToken(socket, data));

  // Управление лобби
  socket.on('lobby:getRooms', () => lobbyHandler.getRooms(socket));
  socket.on('lobby:createRoom', (data) => lobbyHandler.createRoom(socket, data));
  socket.on('lobby:joinRoom', (data) => lobbyHandler.joinRoom(socket, data));
  socket.on('lobby:leaveRoom', (data) => lobbyHandler.leaveRoom(socket, data));

  // Игровые действия
  socket.on('game:attack', (data) => gameHandler.attack(socket, data));
  socket.on('game:defend', (data) => gameHandler.defend(socket, data));
  socket.on('game:takeCards', (data) => gameHandler.takeCards(socket, data));
  socket.on('game:finishBeat', (data) => gameHandler.finishBeat(socket, data));
  socket.on('game:transfer', (data) => gameHandler.transfer(socket, data));
  socket.on('game:addCards', (data) => gameHandler.addCards(socket, data));

  // Переподключение
  socket.on('reconnect:token', (data) => reconnectHandler.handleReconnect(socket, data));

  // Обработка отключения
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    reconnectHandler.handleDisconnect(socket);
  });
});

// Инициализация сервера
async function startServer() {
  try {
    // Подключаемся к Redis
    await redisService.connect();
    console.log('Connected to Redis');

    // Запускаем HTTP сервер
    httpServer.listen(config.port, () => {
      console.log(`🚀 Durak Online Server running on port ${config.port}`);
      console.log(`📍 Environment: ${config.nodeEnv}`);
      console.log(`🎮 Health check: http://localhost:${config.port}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await redisService.disconnect();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

startServer();
