import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { PrismaErrorCodes } from '../../adapters/prisma/constant'

export const isPrismaErrorNotFound = (
  err: unknown
): err is PrismaClientKnownRequestError & { code: PrismaErrorCodes.NotFound } =>
  err instanceof PrismaClientKnownRequestError &&
  err.code === PrismaErrorCodes.NotFound
