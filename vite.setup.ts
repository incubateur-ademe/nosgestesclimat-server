import { PGlite } from '@electric-sql/pglite'
import { Prisma, PrismaClient } from '@prisma/client'
import { readFile, readdir } from 'fs/promises'
import path from 'path'
import { PrismaPGlite } from 'pglite-prisma-adapter'
import redisMock from 'redis-mock'
import { promisify } from 'util'
import { afterAll, afterEach, beforeAll, expect, vi } from 'vitest'
import {
  mswServer,
  resetMswServer,
} from './src/core/__tests__/fixtures/server.fixture'

const pgClient = new PGlite()
const adapter = new PrismaPGlite(pgClient)
const redis = redisMock.createClient()
redis.get = promisify(redis.get.bind(redis)) as unknown as (typeof redis)['get']
redis.exists = promisify(
  redis.exists.bind(redis)
) as unknown as (typeof redis)['exists']
const prisma = new PrismaClient({ adapter })
const prismaMigrationDir = path.join(
  import.meta.dirname,
  'prisma',
  'migrations'
)

type DelegateNames = Prisma.TypeMap['meta']['modelProps']
type DelegateName = TuplifyUnion<DelegateNames>[0]

vi.mock('winston', async () => ({
  default: {
    ...(await vi.importActual('winston')),
    format: {
      combine: vi.fn(),
      colorize: vi.fn(),
      timestamp: vi.fn(),
      json: vi.fn(),
      errors: vi.fn(),
    },
    transports: {
      Console: vi.fn(),
    },
    createLogger: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}))
vi.mock('./src/adapters/prisma/client', () => ({
  prisma,
}))
vi.mock('./src/adapters/redis/client', () => ({
  redis,
  redisClientFactory: () => redis,
}))
vi.mock('./src/features/authentication/authentication.service', async () => ({
  ...(await vi.importActual(
    './src/features/authentication/authentication.service'
  )),
  generateVerificationCodeAndExpiration: vi.fn(),
}))

const models = Prisma.dmmf.datamodel.models
  .map(({ name }) => ({
    name,
    delegateKey: name.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
      index === 0 ? word.toLowerCase() : word.toUpperCase()
    ) as DelegateName,
  }))
  .map(({ name, delegateKey }) => ({
    name,
    delegate: prisma[delegateKey],
  }))

beforeAll(async () => {
  mswServer.listen({
    onUnhandledRequest(request, print) {
      const url = new URL(request.url)

      if (url.hostname === '127.0.0.1') {
        return
      }

      print.warning()
      print.error()
    },
  })

  const [migrationPaths] = await Promise.all([
    readdir(prismaMigrationDir),
    // Need to subscribe to redis channels
    import('./src/worker'),
  ])

  await migrationPaths
    .filter((migrationPath) => migrationPath !== 'migration_lock.toml')
    .map((migrationPath) =>
      path.join(prismaMigrationDir, migrationPath, 'migration.sql')
    )
    .reduce(async (promise, filename) => {
      await promise
      const migration = await readFile(filename, 'utf8')
      await pgClient.exec(migration)
    }, Promise.resolve())
})

afterAll(async () => {
  mswServer.close()
  await prisma.$disconnect()
  await pgClient.close()
  redis.quit()
})

afterEach(async () => {
  resetMswServer()

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
