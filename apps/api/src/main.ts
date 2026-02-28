import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { Request, Response, NextFunction } from 'express';

import { AppModule } from './modules/app.module';
import { HttpExceptionFilter, REQUEST_ID_HEADER } from './common';

const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create(AppModule, {
    logger: new Logger(),
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = 3000;
  app.useLogger(app.get(Logger));
  app.use((request: Request, _response: Response, next: NextFunction) => {
    const requestId = request.header(REQUEST_ID_HEADER) ?? 'unknown';
    app.get(Logger).log(`Request started (${requestId})`, 'HTTP');
    next();
  });
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`API listening on port ${port}`);
};

void bootstrap();
