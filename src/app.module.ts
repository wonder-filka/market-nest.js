import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupportModule } from './support/support.module';
import { QuotesModule } from './quotes/quotes.module';
import { WalletsModule } from './wallets/wallets.module';

@Module({
  imports: [SupportModule, QuotesModule, WalletsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
