import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

/** HTTP-level setup shared by main.ts and the e2e tests. */
export function setupApp(app: INestApplication) {
  const config = app.get(ConfigService);
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.enableCors({
    origin: config.get<string>('CORS_ORIGINS', '').split(',').filter(Boolean),
  });
  app.enableShutdownHooks();

  const doc = new DocumentBuilder()
    .setTitle('Spotify Clone API')
    .setDescription(
      'NestJS showcase: modules/DI, guards, RBAC, pipes, interceptors, filters, Prisma, Redis cache & throttling.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'docs',
    app,
    () => SwaggerModule.createDocument(app, doc),
    {
      swaggerOptions: { persistAuthorization: true },
    },
  );
  return app;
}
