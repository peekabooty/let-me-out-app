import { INestApplication, ValidationPipe } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';
import { Theme } from '@repo/types';
import type { NextFunction, Request, Response } from 'express';
import type { AddressInfo } from 'node:net';

import { UsersController } from './users.controller';

describe('UsersController theme endpoint (e2e)', () => {
  const commandBus = {
    execute: jest.fn().mockResolvedValue(null),
  };

  const queryBus = {
    execute: jest.fn(),
  };

  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
      ],
    }).compile();

    const nestApp = moduleRef.createNestApplication();
    nestApp.use(
      (
        request: Request & { user?: { userId: string } },
        _response: Response,
        next: NextFunction
      ) => {
        request.user = { userId: '01900000-0000-7000-8000-000000000001' };
        next();
      }
    );
    nestApp.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })
    );
    await nestApp.init();
    await new Promise<void>((resolve) => nestApp.getHttpServer().listen(0, resolve));
    app = nestApp;
  });

  afterEach(() => {
    commandBus.execute.mockClear();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts valid theme values', async () => {
    const address = app.getHttpServer().address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/users/me/theme`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: Theme.CARAMEL }),
    });

    expect(response.status).toBe(204);
    expect(commandBus.execute).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid theme values with 400', async () => {
    const address = app.getHttpServer().address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/users/me/theme`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: 'ultraviolet' }),
    });

    expect(response.status).toBe(400);
    expect(commandBus.execute).not.toHaveBeenCalled();
  });
});
