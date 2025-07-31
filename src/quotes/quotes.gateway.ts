import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Server } from 'socket.io';
import { QuotesService } from './quotes.service';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class QuotesGateway implements OnModuleInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(QuotesGateway.name);
  private quotesInterval: NodeJS.Timeout;

  constructor(private readonly quotesService: QuotesService) {}

  onModuleInit() {
    this.startQuotesInterval();
  }

  private startQuotesInterval() {
    this.quotesInterval = setInterval(() => {
      this.quotesService
        .getQuotes()
        .then((quotes) => {
          this.server.emit('quotes-update', quotes);
        })
        .catch((err) => {
          this.logger.error('Ошибка получения котировок:', err);
        });
    }, 10 * 1000);
  }

  onModuleDestroy() {
    if (this.quotesInterval) {
      clearInterval(this.quotesInterval);
    }
  }
}
