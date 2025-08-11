// src/wallets/wallets.controller.ts
import { Body, Controller, Param, Post } from '@nestjs/common';
import { WalletsService } from './wallets.service';

@Controller('users/:userId/wallets')
export class WalletsController {
  constructor(private readonly wallets: WalletsService) {}

  // универсальный EVM эндпоинт: currency = 'ETH' | 'USDT' | 'BTC'
  @Post('evm')
  async getOrCreateEvm(
    @Param('userId') userId: string,
    @Body() body: { currency?: 'USDT' | 'BTC' | 'ETH' },
  ) {
    return this.wallets.getOrCreateEvmWallet(userId, body.currency ?? 'USDT');
  }

  // оставляем сахар-эндпоинт для ETH
  @Post('ethereum')
  async createEthereum(@Param('userId') userId: string) {
    return this.wallets.createEthereumWallet(userId);
  }
}
