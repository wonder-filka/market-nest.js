import { Injectable, Logger } from '@nestjs/common';
import yahooFinance from 'yahoo-finance2';

export interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  buy: number;
  sell: number;
  history: Array<{
    time: string;
    open: number;
    close: number;
    high: number;
    low: number;
    price: number;
  }>;
}

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);

  private readonly symbols = [
    '^NDX',
    '^GSPC',
    '^DJI',
    'BTC-USD',
    'ETH-USD',
    'GC=F',
    'CL=F',
    'COMT',
  ];

  async getQuotes(): Promise<Quote[]> {
    const today = new Date();
    const from = new Date();
    from.setDate(today.getDate() - 30);

    try {
      const result = await Promise.all(
        this.symbols.map(async (symbol) => {
          const history = await yahooFinance.chart(symbol, {
            period1: from.toISOString().split('T')[0],
            period2: today.toISOString().split('T')[0],
            interval: '1d',
          });

          const prices = history.quotes || [];
          const last = prices.at(-1);
          const prev = prices.at(-2);
          const SPREAD = 0.05;

          return {
            symbol,
            name: symbol,
            price: last?.close ?? 0,
            change: (last?.close ?? 0) - (prev?.close ?? 0),
            buy: last?.close ? last.close + SPREAD : 0,
            sell: last?.close ?? 0,
            history: prices.map((d) => ({
              time: new Date(d.date).toISOString().slice(5, 10),
              open: d.open ?? 0,
              close: d.close ?? 0,
              high: d.high ?? 0,
              low: d.low ?? 0,
              price: d.close ?? 0,
            })),
          };
        }),
      );

      return result;
    } catch (error) {
      this.logger.error('Error fetching quotes:', error);
      return [];
    }
  }
}
