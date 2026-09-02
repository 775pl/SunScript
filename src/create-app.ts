import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import helmet from 'helmet';
import { AppModule } from './app.module';

export async function createApp() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: ['error', 'warn'] });
  return configureApp(app);
}

export function configureApp(app: NestExpressApplication) {
  const root = join(__dirname, '..');
  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: { directives: {
      defaultSrc: ["'self'"], scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:'],
      baseUri: ["'self'"], frameAncestors: ["'none'"], objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    } },
    strictTransportSecurity: process.env.NODE_ENV === 'production' ? { maxAge: 31536000 } : false,
  }));
  app.use((_req: unknown, res: import('express').Response, next: () => void) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()'); next();
  });
  app.useStaticAssets(join(root, 'public'), { index: false, maxAge: 0, dotfiles: 'deny' });
  app.setBaseViewsDir(join(root, 'views'));
  app.setViewEngine('ejs');
  return app;
}
