import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SeedService } from './seed.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const result = await app.get(SeedService).seedDemoData();
    console.log(result.message);
    console.log(result.counts);
  } finally {
    await app.close();
  }
}

void bootstrap();
