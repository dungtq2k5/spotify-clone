import { ConsoleLogger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Structured JSON logs in production, pretty logs in dev.
    logger: new ConsoleLogger({ json: process.env.NODE_ENV === 'production' }),
  });
  setupApp(app);
  await app.listen(app.get(ConfigService).getOrThrow<number>('PORT'));
}
void bootstrap();
