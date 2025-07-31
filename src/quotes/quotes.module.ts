import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuotesGateway } from './quotes.gateway';

@Module({
  providers: [QuotesService, QuotesGateway],
  exports: [QuotesService],
})
export class QuotesModule {}
