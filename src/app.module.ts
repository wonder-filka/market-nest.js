import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupportModule } from './support/support.module';
import { QuotesModule } from './quotes/quotes.module';

@Module({
  imports: [SupportModule, QuotesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
