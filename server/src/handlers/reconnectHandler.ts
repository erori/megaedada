import { Socket } from 'socket.io';
import { redisService } from '../services/redisService';
import { v4 as uuidv4 } from 'uuid';

class ReconnectHandler {
  async handleReconnect(socket: Socket, data: { token: string }): Promise<void> {
    try {
      const playerId = await redisService.getReconnectToken(data.token);
      
      if (!playerId) {
        socket.emit('error', { message: 'Токен переподключения истек или недействителен' });
        return;
      }

      // Получаем старую сессию
      const oldSocketId = await redisService.getPlayerSession(playerId);
      
      // Обновляем сессию на новый socket
      await redisService.setPlayerSession(playerId, socket.id);
      
      // Генерируем новый токен переподключения
      const newReconnectToken = uuidv4();
      await redisService.setReconnectToken(playerId, newReconnectToken);
      
      // Находим комнату игрока
      const rooms = await redisService.getAllRooms();
      const playerRoom = rooms.find(room => 
        room.players.some((p: any) => p.id === playerId)
      );
      
      if (playerRoom) {
        // Подключаем игрока к комнате
        socket.join(playerRoom.id);
        
        // Отправляем игроку текущее состояние игры
        socket.emit('game:reconnected', {
          playerId,
          roomId: playerRoom.id,
          gameState: playerRoom.gameState,
          reconnectToken: newReconnectToken
        });

        // Уведомляем других игроков о переподключении
        socket.to(playerRoom.id).emit('player:reconnected', { playerId });
        
        console.log(`Player ${playerId} reconnected with socket ${socket.id}`);
      } else {
        socket.emit('error', { message: 'Игровая комната не найдена' });
      }
    } catch (error) {
      console.error('Reconnect error:', error);
      socket.emit('error', { message: 'Ошибка переподключения' });
    }
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    try {
      // Генерируем токен для переподключения
      const rooms = await redisService.getAllRooms();
      
      for (const room of rooms) {
        const disconnectedPlayer = room.players.find((p: any) => 
          p.socketId === socket.id
        );
        
        if (disconnectedPlayer) {
          // Генерируем токен переподключения
          const reconnectToken = uuidv4();
          await redisService.setReconnectToken(disconnectedPlayer.id, reconnectToken);
          
          // У
