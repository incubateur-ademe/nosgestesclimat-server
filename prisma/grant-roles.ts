import { Prisma, PrismaClient } from '@prisma/client'

if (!process.env.DATABASE_READONLY_ROLES) {
  console.info('No role to grant')
  process.exit(0)
}

const prisma = new PrismaClient()
const roles = process.env.DATABASE_READONLY_ROLES.split(',')

Promise.all(
  roles.map((role) =>
    prisma.$queryRaw(
      Prisma.sql([`GRANT SELECT ON ALL TABLES IN SCHEMA "ngc" TO "${role}";`])
    )
  )
)
  .then(() => {
    console.info(`${roles.length} role(s) granted`)
    process.exit(0)
  })
  .catch((err) => {
    console.error('Grant error', err)
    process.exit(1)
  })