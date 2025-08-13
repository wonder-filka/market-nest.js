// src/wallets/wallets.controller.ts
import { Body, Controller, Param, Post } from '@nestjs/common';
import { WalletsService } from './wallets.service';

@Controller('users/:userId/wallets')
export class WalletsController {
  constructor(private readonly wallets: WalletsService) {}

  // ------- EVM -------
  @Post('evm')
  async getOrCreateEvm(
    @Param('userId') userId: string,
    @Body() body: { currency?: 'USDT' | 'BTC' | 'ETH' },
  ) {
    return this.wallets.getOrCreateEvmWallet(userId, body.currency ?? 'USDT');
  }

  @Post('ethereum')
  async createEthereum(@Param('userId') userId: string) {
    return this.wallets.createEthereumWallet(userId);
  }

  // ------- TRON -------
  @Post('tron')
  async getOrCreateTron(
    @Param('userId') userId: string,
    @Body() body: { currency?: 'USDT' | 'TRX' },
  ) {
    return this.wallets.getOrCreateTronWallet(userId, body.currency ?? 'USDT');
  }

  @Post('tron/trx')
  async createTrx(@Param('userId') userId: string) {
    return this.wallets.createTronWallet(userId); // TRX-кошелёк
  }

  @Post('tron/usdt')
  async createTronUsdt(@Param('userId') userId: string) {
    return this.wallets.createTronUsdtWallet(userId); // USDT-TRC20 кошелёк
  }
}
