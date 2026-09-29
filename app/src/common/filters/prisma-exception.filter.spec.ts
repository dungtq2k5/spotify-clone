import {
  ArgumentsHost,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '../../generated/prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('db error', {
    code,
    clientVersion: 'test',
  });

describe('PrismaExceptionFilter', () => {
  const filter = new PrismaExceptionFilter();
  const host = {} as ArgumentsHost;
  let superCatch: jest.SpyInstance;

  beforeEach(() => {
    superCatch = jest
      .spyOn(BaseExceptionFilter.prototype, 'catch')
      .mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it.each([
    ['P2002', ConflictException],
    ['P2003', ConflictException],
    ['P2025', NotFoundException],
  ])('maps %s to %p', (code, Expected) => {
    filter.catch(prismaError(code), host);
    expect(superCatch.mock.calls[0][0]).toBeInstanceOf(Expected);
  });

  it('passes unknown codes through untouched (→ 500)', () => {
    const err = prismaError('P9999');
    filter.catch(err, host);
    expect(superCatch.mock.calls[0][0]).toBe(err);
  });
});
