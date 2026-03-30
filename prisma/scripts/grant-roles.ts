import type { PrismaClient } from '@prisma/client'
import { Prisma } from '@prisma/client'

export const exec = async ({ prisma }: { prisma: PrismaClient }) => {
  if (process.env.DATABASE_READONLY_ROLES) {
    const roles = process.env.DATABASE_READONLY_ROLES.split(',')
    try {
      await roles.reduce(
        (prom, role) =>
          prom
            .then(() =>
              prisma.$queryRaw(
                Prisma.sql([`GRANT USAGE ON SCHEMA "ngc" TO "${role}";`])
              )
            )
            .then(() =>
              prisma.$queryRaw(
                Prisma.sql([
                  `GRANT SELECT ON ALL TABLES IN SCHEMA "ngc" TO "${role}";`,
                ])
              )
            )
            .then(() =>
              prisma.$queryRaw(
                Prisma.sql([
                  `ALTER DEFAULT PRIVILEGES IN SCHEMA "ngc" GRANT SELECT ON TABLES TO "${role}";`,
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
  } else {
    console.info('No readonly role to grant')
  }

  if (process.env.DATABASE_READONLY_ANON_ROLES) {
    const anonRoles = process.env.DATABASE_READONLY_ANON_ROLES.split(',')
    try {
      await anonRoles.reduce(
        (prom, role) =>
          prom
            .then(() =>
              prisma.$queryRaw(
                Prisma.sql([`GRANT USAGE ON SCHEMA "ngc_anon" TO "${role}";`])
              )
            )
            .then(() =>
              prisma.$queryRaw(
                Prisma.sql([
                  `GRANT SELECT ON ALL TABLES IN SCHEMA "ngc_anon" TO "${role}";`,
                ])
              )
            )
            .then(() =>
              prisma.$queryRaw(
                Prisma.sql([
                  `ALTER DEFAULT PRIVILEGES IN SCHEMA "ngc_anon" GRANT SELECT ON TABLES TO "${role}";`,
                ])
              )
            ),
        Promise.resolve()
      )
      console.info(`${anonRoles.length} anon role(s) granted`)
    } catch (err) {
      console.error('Grant error', err)
      throw err
    }
  } else {
    console.info('No readonly anon role to grant')
  }
}
