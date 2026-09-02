import { createApp } from './create-app';

async function bootstrap() {
  const app = await createApp();
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
  console.info(`SunScript: http://localhost:${process.env.PORT ?? 3000}`);
}
bootstrap().catch(error => { console.error(error); process.exitCode = 1; });
