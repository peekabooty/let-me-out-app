import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { DomainException } from './domain-exception';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const isDomainException = exception instanceof DomainException;
    const isHttpException = exception instanceof HttpException;

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'Unexpected error';

    if (isDomainException) {
      statusCode = exception.statusCode;
      errorCode = exception.code;
      message = exception.message;
    } else if (isHttpException) {
      statusCode = exception.getStatus();
      errorCode = HttpStatus[exception.getStatus()];
      message = exception.message;
    }

    response.status(statusCode).json({
      statusCode,
      error: errorCode,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
