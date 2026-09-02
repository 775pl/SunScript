import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './create-app';

async function bootstrap() {
  // Keep the framework import and bootstrap here for Vercel entrypoint detection.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: ['error', 'warn'] });
  configureApp(app);
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
  console.info(`SunScript: http://localhost:${process.env.PORT ?? 3000}`);
}
bootstrap().catch(error => { console.error(error); process.exitCode = 1; });
