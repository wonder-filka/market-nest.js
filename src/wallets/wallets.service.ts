// src/wallets/wallets.service.ts
import { Injectable } from '@nestjs/common';

import { ethers } from 'ethers';
import { PrismaService } from 'src/prisma.service';

type ServiceResult<T> = T | { message: string };

@Injectable()
export class WalletsService {
  constructor(private readonly prisma: PrismaService) {}

  // существующий метод для EVM-кошельков (USDT и т.п.)
  async getOrCreateEvmWallet(
    userId: string,
    currency: 'USDT' | 'BTC' | 'ETH' = 'USDT',
  ): Promise<ServiceResult<{ address: string }>> {
    try {
      const existing = await this.prisma.cryptoWallet.findFirst({
        where: { userId, currency, chain: 'ETHEREUM' },
        select: { address: true },
      });
      if (existing) return existing;

      const w = ethers.Wallet.createRandom();
      const address = w.address;
      const privateKey = w.privateKey;
      const mnemonic = w.mnemonic?.phrase ?? '';

      const created = await this.prisma.cryptoWallet.create({
        data: {
          userId,
          currency, // теперь можно передать 'ETH'
          chain: 'ETHEREUM',
          address,
          privateKey,
          mnemonic,
        },
        select: { address: true },
      });

      return created; // { address }
    } catch (error) {
      console.error('createEvmWallet error:', error);
      return { message: 'Ошибка при создании кошелька (EVM)' };
    }
  }

  // опционально: сахар-метод именно под ETH
  async createEthereumWallet(userId: string) {
    return this.getOrCreateEvmWallet(userId, 'ETH');
  }
}
