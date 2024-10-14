import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { PrismaErrorCodes } from '../../adapters/prisma/constant'

const isPrismaError = (err: unknown): err is PrismaClientKnownRequestError =>
  err instanceof PrismaClientKnownRequestError

export const isPrismaErrorNotFound = (
  err: unknown
): err is PrismaClientKnownRequestError & { code: PrismaErrorCodes.NotFound } =>
  isPrismaError(err) && err.code === PrismaErrorCodes.NotFound

export const isPrismaErrorForeignKeyConstraintFailed = (
  err: unknown
): err is PrismaClientKnownRequestError & {
  code: PrismaErrorCodes.ForeignKeyConstraintFailed
} =>
  isPrismaError(err) && err.code === PrismaErrorCodes.ForeignKeyConstraintFailed

export const isPrismaErrorUniqueConstraintFailed = (
  err: unknown
): err is PrismaClientKnownRequestError & {
  code: PrismaErrorCodes.UniqueConstraintFailed
} => isPrismaError(err) && err.code === PrismaErrorCodes.UniqueConstraintFailed
