import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { SupportService } from './support.service';
import { SendMessageDto } from './dto/send-message.dto';
import { MarkAsReadDto } from './dto/mark-as-read.dto';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class SupportGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SupportGateway.name);
  private connectedAdmins = new Map<string, string>();
  private connectedUsers = new Map<string, string>();

  constructor(private readonly supportService: SupportService) {}

  handleConnection(client: Socket) {
    this.logger.log(`✅ Користувач підключився: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`❌ Користувач відключився: ${client.id}`);
    this.connectedAdmins.delete(client.id);
    this.connectedUsers.delete(client.id);
  }

  @SubscribeMessage('join-user')
  handleJoinUser(
    @MessageBody() userId: string,
    @ConnectedSocket() client: Socket,
  ) {
    this.connectedUsers.set(client.id, userId);
    client.join(`user-${userId}`);
    this.logger.log(`User ${userId} joined personal room`);
  }

  @SubscribeMessage('leave-user')
  handleLeaveUser(
    @MessageBody() userId: string,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`User ${userId} left personal room`);
    this.connectedUsers.delete(client.id);
    client.leave(`user-${userId}`);
  }

  @SubscribeMessage('join-admin')
  handleJoinAdmin(
    @MessageBody() adminId: string,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Admin ${adminId} joined`);
    this.connectedAdmins.set(client.id, adminId);
    client.join('admins');
  }

  @SubscribeMessage('join-chat')
  handleJoinChat(
    @MessageBody() chatId: string,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`User joined chat: ${chatId}`);
    client.join(`chat-${chatId}`);
  }

  @SubscribeMessage('leave-chat')
  handleLeaveChat(
    @MessageBody() chatId: string,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`User left chat: ${chatId}`);
    client.leave(`chat-${chatId}`);
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    @MessageBody() data: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const message = await this.supportService.sendMessage(data);

      // Отправляем сообщение в конкретный чат
      this.server.to(`chat-${data.chatId}`).emit('new-message', message);
      this.logger.log(`Message saved and sent: ${message.id}`);

      // Отправляем уведомление всем админам о новом сообщении
      this.server.to('admins').emit('chat-updated', {
        chatId: data.chatId,
        lastMessage: {
          content: message.content,
          createdAt: message.createdAt,
          isRead: message.isRead,
          isSupport: message.isSupport,
        },
        status: 'IN_PROGRESS',
      });
    } catch (error) {
      this.logger.error('Error saving message:', error);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('request-user-chat')
  async handleRequestUserChat(
    @MessageBody() userId: string,
    @ConnectedSocket() client: Socket,
  ): Promise<any> {
    try {
      const chat = await this.supportService.getUserChat(userId);
      this.logger.log(`Sent chat data for chat: ${chat.id} to ${client.id}`);

      if (chat && chat.status !== 'CLOSED') {
        client.join(`chat-${chat.id}`);
        this.logger.log(`${client.id} joined chat room: chat-${chat.id}`);
      }
      if (chat.messages.length === 0) {
        this.server.to('admins').emit('new-chat', chat);
      }

      return chat;
    } catch (error) {
      this.logger.error('Failed to request user chat:', error);
      return { error: 'Failed to load chat data' };
    }
  }

  @SubscribeMessage('mark-as-read')
  async handleMarkAsRead(
    @MessageBody() data: MarkAsReadDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      await this.supportService.markAsRead(data);

      // Уведомить об обновлении
      this.server
        .to(`chat-${data.chatId}`)
        .emit('messages-read', { chatId: data.chatId });
    } catch (error) {
      this.logger.error('Error marking messages as read:', error);
    }
  }

  @SubscribeMessage('close-chat')
  async handleCloseChat(
    @MessageBody() chatId: string,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const updatedChat = await this.supportService.closeChat(chatId);

      // Уведомляем всех в чате об изменении статуса
      this.server.to(`chat-${chatId}`).emit('chat-status-updated', {
        chatId,
        status: 'CLOSED',
      });
      this.logger.log(`Chat ${chatId} status updated to CLOSED`);

      // Уведомить всех админов об изменении статуса
      this.server
        .to('admins')
        .emit('chat-updated', { chatId, status: 'CLOSED' });

      // Уведомляем пользователя в его персональной комнате
      this.server.to(`user-${updatedChat.userId}`).emit('chat-status-updated', {
        chatId,
        status: 'CLOSED',
      });
    } catch (error) {
      this.logger.error('Error closing chat:', error);
      client.emit('error', { message: 'Failed to close chat' });
    }
  }
}
