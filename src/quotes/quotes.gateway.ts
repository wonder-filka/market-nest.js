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
          const frozenSymbols = new Set(
            quotes
              .sort(() => Math.random() - 0.5) // перемешиваем массив
              .slice(0, 3) // берём первые 3
              .map((q) => q.symbol),
          );

          const updatedQuotes = quotes.map((q) => {
            // Если символ в frozenSymbols — оставляем цены без изменений
            if (frozenSymbols.has(q.symbol)) {
              return {
                ...q,
                price: +q.price.toFixed(3),
                sell: +q.sell.toFixed(3),
                buy: +q.buy.toFixed(3),
              };
            }

            // Для остальных — изменение от 0 до 0.03
            const randomDiff = +(Math.random() * 0.05).toFixed(2);

            return {
              ...q,
              price: +(q.price + randomDiff).toFixed(3),
              sell: +(q.sell + randomDiff).toFixed(3),
              buy: +(q.buy + randomDiff).toFixed(3),
            };
          });
          this.server.emit('quotes-update', updatedQuotes);
        })
        .catch((err) => {
          this.logger.error('Ошибка получения котировок:', err);
        });
    }, 1 * 1000);
  }

  onModuleDestroy() {
    if (this.quotesInterval) {
      clearInterval(this.quotesInterval);
    }
  }
}
