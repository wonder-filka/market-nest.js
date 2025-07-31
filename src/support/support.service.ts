import { Injectable, Logger } from '@nestjs/common';

import { SendMessageDto } from './dto/send-message.dto';
import { MarkAsReadDto } from './dto/mark-as-read.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sendMessage(data: SendMessageDto) {
    const { chatId, senderId, content, isSupport } = data;

    // Сохраняем сообщение в БД
    const message = await this.prisma.supportMessage.create({
      data: {
        chatId,
        senderId,
        content,
        isSupport,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Обновляем статус чата
    await this.prisma.supportChat.update({
      where: { id: chatId },
      data: {
        updatedAt: new Date(),
        status: 'IN_PROGRESS',
      },
    });

    return message;
  }

  async getUserChat(userId: string) {
    this.logger.log(`Received request for chat data for user: ${userId}`);

    let chat = await this.prisma.supportChat.findFirst({
      where: { userId, status: { not: 'CLOSED' } },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!chat) {
      this.logger.log(
        `No active chat found for user ${userId}. Creating new one.`,
      );

      // Проверяем, существует ли пользователь
      const existingUser = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Создаем новый чат
      chat = await this.prisma.supportChat.create({
        data: {
          userId,
          subject: 'Общая поддержка',
          status: 'OPEN',
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'asc' },
            include: {
              sender: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      this.logger.log(`New chat created with ID: ${chat.id}`);
    }

    return chat;
  }

  async markAsRead(data: MarkAsReadDto) {
    const { chatId, userId, isSupport } = data;

    await this.prisma.supportMessage.updateMany({
      where: {
        chatId,
        senderId: { not: userId },
        isRead: false,
        isSupport: !isSupport,
      },
      data: {
        isRead: true,
      },
    });
  }

  async closeChat(chatId: string) {
    const updatedChat = await this.prisma.supportChat.update({
      where: { id: chatId },
      data: { status: 'CLOSED' },
      include: {
        user: true,
      },
    });

    return updatedChat;
  }
}
