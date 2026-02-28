import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { uuidv7 } from 'uuidv7';

import { REQUEST_ID_HEADER } from './request-id.constants';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const incomingId = request.header(REQUEST_ID_HEADER);
    const requestId = incomingId && incomingId.length > 0 ? incomingId : uuidv7();

    request.headers[REQUEST_ID_HEADER] = requestId;
    response.setHeader(REQUEST_ID_HEADER, requestId);

    next();
  }
}
