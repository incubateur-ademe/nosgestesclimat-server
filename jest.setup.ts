import { PGlite } from '@electric-sql/pglite'
import { Prisma, PrismaClient } from '@prisma/client'
import { readFile, readdir } from 'fs/promises'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import nock from 'nock'
import path from 'path'
import { PrismaPGlite } from 'pglite-prisma-adapter'
import connect from './src/utils/initDatabase'

const client = new PGlite()
const adapter = new PrismaPGlite(client)
const prisma = new PrismaClient({ adapter })
const prismaMigrationDir = path.join(__dirname, 'prisma', 'migrations')

type DelegateNames = Prisma.TypeMap['meta']['modelProps']
type DelegateName = TuplifyUnion<DelegateNames>[0]

jest.mock('winston')
jest.mock('./src/features/authentication/authentication.service', () => ({
  ...jest.requireActual('./src/features/authentication/authentication.service'),
  generateVerificationCodeAndExpiration: jest.fn(),
}))

jest.mock('./src/adapters/prisma/client', () => ({
  prisma,
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

let mongod: MongoMemoryServer | undefined

beforeAll(async () => {
  const mongoUrl = new URL(process.env.MONGO_URL || '')

  mongod = await MongoMemoryServer.create({
    instance: {
      port: +mongoUrl.port,
    },
    binary: {
      // version: '4.0.3', // Should be activated
    },
  })

  await connect()

  const migrationPaths = await readdir(prismaMigrationDir)

  await migrationPaths
    .filter((migrationPath) => migrationPath !== 'migration_lock.toml')
    .map((migrationPath) =>
      path.join(prismaMigrationDir, migrationPath, 'migration.sql')
    )
    .reduce(async (promise, filename) => {
      await promise
      const migration = await readFile(filename, 'utf8')
      await client.exec(migration)
    }, Promise.resolve())
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
