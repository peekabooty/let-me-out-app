import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { Request, Response, NextFunction } from 'express';

import { AppModule } from './modules/app.module';
import { HttpExceptionFilter, REQUEST_ID_HEADER } from './common';

const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create(AppModule, {
    logger: new Logger(),
  });
  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors({
    origin: configService.getOrThrow<string>('CORS_ORIGIN'),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  });

  const port = configService.get<number>('APP_PORT') ?? 3000;
  const logger = new Logger('HTTP');
  app.useLogger(logger);
  app.use((request: Request, _response: Response, next: NextFunction) => {
    const requestId = request.header(REQUEST_ID_HEADER) ?? 'unknown';
    logger.log(`Request started (${requestId})`);
    next();
  });
  await app.listen(port);

  const bootstrapLogger = new Logger('Bootstrap');
  bootstrapLogger.log(`API listening on port ${port}`);
};

void bootstrap();
