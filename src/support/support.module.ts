import { Module } from '@nestjs/common';
import { SupportService } from './support.service';
import { SupportGateway } from './support.gateway';
import { PrismaService } from 'src/prisma.service';

@Module({
  providers: [SupportService, SupportGateway, PrismaService],
})
export class SupportModule {}
