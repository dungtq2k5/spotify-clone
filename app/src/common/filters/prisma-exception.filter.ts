import {
  ArgumentsHost,
  Catch,
  ConflictException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '../../generated/prisma/client';

const MAP: Record<string, () => HttpException> = {
  P2002: () => new ConflictException('Resource already exists'),
  P2003: () => new ConflictException('Referenced resource does not exist'),
  P2025: () => new NotFoundException('Resource not found'),
};

/**
 * Translates known Prisma errors into HTTP errors so services can let the DB
 * enforce uniqueness/existence instead of pre-checking (and racing).
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    super.catch(MAP[exception.code]?.() ?? exception, host);
  }
}
