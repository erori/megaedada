import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/durak',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: parseInt(process.env.REDIS_TTL || '3600', 10),
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'super-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  game: {
    maxPlayersPerRoom: parseInt(process.env.MAX_PLAYERS_PER_ROOM || '6', 10),
    minPlayersPerRoom: parseInt(process.env.MIN_PLAYERS_PER_ROOM || '2', 10),
    turnTimeout: parseInt(process.env.TURN_TIMEOUT || '30000', 10), // 30 секунд
    deckSize: 36,
    minCardsInHand: 6,
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
} as const;
