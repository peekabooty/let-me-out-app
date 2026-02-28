import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './modules/app.module';

const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = 3000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`API listening on port ${port}`);
};

void bootstrap();
