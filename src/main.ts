import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  });
  const PORT = parseInt(process.env.PORT ?? '3001', 10);
  const HOST = process.env.HOST ?? '0.0.0.0';
  await app.listen(PORT, HOST);
}
bootstrap();
