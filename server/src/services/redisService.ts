import { createClient, RedisClientType } from 'redis';
import { config } from '../config/environment';

class RedisService {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    this.client = createClient({
      url: config.redis.url
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      console.log('Redis connected successfully');
      this.isConnected = true;
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }

  // Управление комнатами
  async createRoom(roomId: string, roomData: any): Promise<void> {
    const key = `room:${roomId}`;
    await this.client.setEx(key, config.redis.ttl, JSON.stringify(roomData));
  }

  async getRoom(roomId: string): Promise<any | null> {
    const key = `room:${roomId}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async updateRoom(roomId: string, roomData: any): Promise<void> {
    const key = `room:${roomId}`;
    await this.client.setEx(key, config.redis.ttl, JSON.stringify(roomData));
  }

  async deleteRoom(roomId: string): Promise<void> {
    const key = `room:${roomId}`;
    await this.client.del(key);
  }

  async getAllRooms(): Promise<any[]> {
    const keys = await this.client.keys('room:*');
    const rooms: any[] = [];
    
    for (const key of keys) {
      const data = await this.client.get(key);
      if (data) {
        rooms.push(JSON.parse(data));
      }
    }
    
    return rooms;
  }

  // Управление сессиями игроков
  async setPlayerSession(playerId: string, socketId: string): Promise<void> {
    const key = `player:${playerId}:session`;
    await this.client.setEx(key, config.redis.ttl, socketId);
  }

  async getPlayerSession(playerId: string): Promise<string | null> {
    const key = `player:${playerId}:session`;
    return await this.client.get(key);
  }

  async deletePlayerSession(playerId: string): Promise<void> {
    const key = `player:${playerId}:session`;
    await this.client.del(key);
  }

  // Управление reconnect токенами
  async setReconnectToken(playerId: string, token: string): Promise<void> {
    const key = `reconnect:${token}`;
    await this.client.setEx(key, 300, playerId); // 5 минут на переподключение
  }

  async getReconnectToken(token: string): Promise<string | null> {
    const key = `reconnect:${token}`;
    return await this.client.get(key);
  }

  // Блокировки для атомарных операций
  async acquireLock(lockKey: string, timeoutMs: number = 5000): Promise<boolean> {
    const key = `lock:${lockKey}`;
    const result = await this.client.set(key, '1', {
      NX: true,
      PX: timeoutMs
    });
    return result === 'OK';
  }

  async releaseLock(lockKey: string): Promise<void> {
    const key = `lock:${lockKey}`;
    await this.client.del(key);
  }
}

export const redisService = new RedisService();
