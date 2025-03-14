import { PGlite } from '@electric-sql/pglite'
import { Prisma, PrismaClient } from '@prisma/client'
import { readFile, readdir } from 'fs/promises'
import nock from 'nock'
import path from 'path'
import { PrismaPGlite } from 'pglite-prisma-adapter'
import redisMock from 'redis-mock'

const pgClient = new PGlite()
const adapter = new PrismaPGlite(pgClient)
const redis = redisMock.createClient()
const prisma = new PrismaClient({ adapter })
const prismaMigrationDir = path.join(__dirname, 'prisma', 'migrations')

type DelegateNames = Prisma.TypeMap['meta']['modelProps']
type DelegateName = TuplifyUnion<DelegateNames>[0]

jest.mock('winston')
jest.mock('./src/adapters/prisma/client', () => ({
  prisma,
}))
jest.mock('./src/adapters/redis/client', () => ({
  redis,
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
    ) as DelegateName,
  }))
  .map(({ name, delegateKey }) => ({
    name,
    delegate: prisma[delegateKey],
  }))

beforeAll(async () => {
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

beforeEach(() => nock.cleanAll())

afterAll(async () => {
  await prisma.$disconnect()
  await pgClient.close()
  redis.quit()
})

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
