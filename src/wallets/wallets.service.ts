// src/wallets/wallets.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { TronWeb } from 'tronweb';

type ServiceResult<T> = T | { message: string };

// при желании можешь вынести в конфиг .env
const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  headers: { 'TRON-PRO-API-KEY': process.env.TRON_API_KEY },
});

type Currency = 'USDT' | 'BTC' | 'ETH' | 'TRX';

@Injectable()
export class WalletsService {
  constructor(private readonly prisma: PrismaService) {}

  // ------- существующий EVM-метод (оставляем как есть) -------
  async getOrCreateEvmWallet(
    userId: string,
    currency: Currency = 'USDT',
  ): Promise<ServiceResult<{ address: string }>> {
    try {
      const existing = await this.prisma.cryptoWallet.findFirst({
        where: { userId, currency, chain: 'ETHEREUM' },
        select: { address: true },
      });
      if (existing) return existing;

      // EVM оставим без изменений (ethers)
      const { ethers } = await import('ethers');
      const w = ethers.Wallet.createRandom();
      const created = await this.prisma.cryptoWallet.create({
        data: {
          userId,
          currency,
          chain: 'ETHEREUM',
          address: w.address,
          privateKey: w.privateKey,
          mnemonic: w.mnemonic?.phrase ?? '',
        },
        select: { address: true },
      });
      return created;
    } catch (error) {
      console.error('createEvmWallet error:', error);
      return { message: 'Ошибка при создании кошелька (EVM)' };
    }
  }

  // ------- НОВОЕ: Tron-кошелёк (TRX и USDT-TRC20) -------
  async getOrCreateTronWallet(
    userId: string,
    currency: Extract<Currency, 'USDT' | 'TRX'> = 'USDT',
  ): Promise<ServiceResult<{ address: string }>> {
    try {
      const existing = await this.prisma.cryptoWallet.findFirst({
        where: { userId, currency, chain: 'TRON' },
        select: { address: true },
      });
      if (existing) return existing;

      // создаём аккаунт Tron
      const account = await tronWeb.createAccount();
      // адреса Tron: base58 (начинается на 'T') и hex
      const addressBase58 = account.address.base58;
      const privateKey = account.privateKey;

      const created = await this.prisma.cryptoWallet.create({
        data: {
          userId,
          currency,
          chain: 'TRON', // фиксируем сеть
          address: addressBase58,
          privateKey,
          mnemonic: '', // TronWeb не генерирует мнемонику по умолчанию
        },
        select: { address: true },
      });

      return created;
    } catch (error) {
      console.error('createTronWallet error:', error);
      return { message: 'Ошибка при создании кошелька (TRON)' };
    }
  }

  // сахар-методы
  async createEthereumWallet(userId: string) {
    return this.getOrCreateEvmWallet(userId, 'ETH');
  }

  async createTronWallet(userId: string) {
    return this.getOrCreateTronWallet(userId, 'TRX');
  }

  async createTronUsdtWallet(userId: string) {
    return this.getOrCreateTronWallet(userId, 'USDT');
  }
}
