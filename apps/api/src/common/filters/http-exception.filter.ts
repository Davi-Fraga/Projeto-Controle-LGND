import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'object' && exceptionResponse !== null && 'message' in exceptionResponse
          ? (exceptionResponse as { message: string | string[] }).message
          : (exceptionResponse as string);
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = this.handlePrismaError(exception);
      message = this.getPrismaErrorMessage(exception);
    }

    // Log server-side. NÃO serializar a exceção inteira: `JSON.stringify(exception)`
    // arrasta as props próprias do objeto — em erro de validação, a lista de mensagens
    // do class-validator, que pode ecoar o valor submetido (CPF, telefone, e-mail) para
    // o log (CWE-532). Aqui vai só mensagem + stack; o payload nunca.
    this.logger.error(
      `${request.method} ${request.url} ${status} - ${this.describe(exception)}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      error: {
        statusCode: status,
        message,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    });
  }

  /** Identificação enxuta da exceção para o log — nunca o payload da requisição. */
  private describe(exception: unknown): string {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return `PrismaClientKnownRequestError(${exception.code})`;
    }
    if (exception instanceof Error) {
      return `${exception.name}: ${exception.message}`;
    }
    return 'Unknown exception';
  }

  private handlePrismaError(exception: Prisma.PrismaClientKnownRequestError): number {
    switch (exception.code) {
      case 'P2002':
        return HttpStatus.CONFLICT;
      case 'P2025':
        return HttpStatus.NOT_FOUND;
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  private getPrismaErrorMessage(exception: Prisma.PrismaClientKnownRequestError): string {
    if (exception.code === 'P2002') {
      const targets = (exception.meta?.target as string[]) ?? [];
      return `Conflict: unique constraint violation on field(s) (${targets.join(', ')}).`;
    }
    if (exception.code === 'P2025') {
      return 'The requested record was not found.';
    }
    return 'A database error occurred while processing your request.';
  }
}
