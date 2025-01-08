import type { PrismaClient } from '@prisma/client'
import { Prisma } from '@prisma/client'

export const exec = async (prisma: PrismaClient) => {
  if (!process.env.DATABASE_READONLY_ROLES) {
    console.info('No role to grant')
    return
  }

  const roles = process.env.DATABASE_READONLY_ROLES.split(',')

  try {
    await roles.reduce(
      (prom, role) =>
        prom.then(() =>
          prisma.$queryRaw(
            Prisma.sql([
              `GRANT SELECT ON ALL TABLES IN SCHEMA "ngc" TO "${role}";`,
            ])
          )
        ),
      Promise.resolve()
    )
    console.info(`${roles.length} role(s) granted`)
  } catch (err) {
    console.error('Grant error', err)
    throw err
  }
}
