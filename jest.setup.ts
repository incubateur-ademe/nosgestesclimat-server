import { Prisma } from '@prisma/client'
import { version as clientVersion } from '@prisma/client/package.json'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import nock from 'nock'
import type { Delegate } from 'prismock/build/main/lib/delegate'
import { prisma } from './src/adapters/prisma/client'
import connect from './src/helpers/db/initDatabase'

jest.mock('winston')
jest.mock('@prisma/client', () => ({
  ...jest.requireActual('@prisma/client'),
  PrismaClient: jest.requireActual('prismock').PrismockClient,
}))
jest.mock('./src/features/authentication/authentication.service', () => ({
  ...jest.requireActual('./src/features/authentication/authentication.service'),
  generateVerificationCodeAndExpiration: jest.fn(),
}))

const models = Prisma.dmmf.datamodel.models
  .map(({ name }) => ({
    name,
    delegateKey: name.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
      index === 0 ? word.toLowerCase() : word.toUpperCase()
    ),
  }))
  .map(({ name, delegateKey }) => ({
    name,
    delegate: prisma[delegateKey as keyof typeof prisma] as unknown as Delegate,
  }))

let mongod: MongoMemoryServer | undefined

beforeAll(async () => {
  const mongoUrl = new URL(process.env.MONGO_URL || '')

  /**
   * This patches prismock delegates to raise corresponding error
   * in case of entity not found exception
   */
  models.forEach(({ name, delegate }) => {
    const originalFindUniqueOrThrow = delegate.findUniqueOrThrow

    delegate.findUniqueOrThrow = async (
      ...args: Parameters<Delegate['findUniqueOrThrow']>
    ) => {
      try {
        return await originalFindUniqueOrThrow.apply(delegate, args)
      } catch {
        throw new PrismaClientKnownRequestError(`No ${name} found`, {
          code: 'P2025',
          clientVersion,
        })
      }
    }

    const originalFindFirstOrThrow = delegate.findFirstOrThrow

    delegate.findFirstOrThrow = async (
      ...args: Parameters<Delegate['findFirstOrThrow']>
    ) => {
      try {
        return await originalFindFirstOrThrow.apply(delegate, args)
      } catch {
        throw new PrismaClientKnownRequestError(`No ${name} found`, {
          code: 'P2025',
          clientVersion,
        })
      }
    }

    const originalUpdate = delegate.update

    delegate.update = async (...args: Parameters<Delegate['update']>) => {
      const updated = await originalUpdate.apply(delegate, args)

      if (!updated) {
        throw new PrismaClientKnownRequestError(`No ${name} found`, {
          code: 'P2025',
          clientVersion,
          meta: {
            cause: 'Record to update not found.',
            modelName: name,
          },
        })
      }

      return updated
    }

    const originalDelete = delegate.delete

    delegate.delete = async (...args: Parameters<Delegate['delete']>) => {
      try {
        return await originalDelete.apply(delegate, args)
      } catch {
        throw new PrismaClientKnownRequestError(`No ${name} found`, {
          code: 'P2025',
          clientVersion,
          meta: {
            cause: 'Record to delete does not exist.',
            modelName: name,
          },
        })
      }
    }
  })

  mongod = await MongoMemoryServer.create({
    instance: {
      port: +mongoUrl.port,
    },
    binary: {
      // version: '4.0.3', // Should be activated
    },
  })

  await connect()
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongod?.stop()
})

beforeEach(() => nock.cleanAll())

afterEach(async () => {
  expect(nock.isDone()).toBeTruthy()

  await Promise.all(
    models.map(async ({ delegate, name }) => {
      try {
        expect(await delegate.count({})).toBe(0)
      } catch {
        console.warn(
          `${name} resources found after the test, please clean database after each test to avoid flaky tests`
        )
      }
    })
  )
})
