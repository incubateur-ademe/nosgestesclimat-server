import { PrismaClient } from '@prisma/client'
import { redis } from '../src/adapters/redis/client'

const prisma = new PrismaClient()

const main = async () => {
  // Order matters here
  const scripts = [
    await import('./scripts/grant-roles'),
    await import('./scripts/add-integrations-api-scopes'),
    await import('./scripts/add-integrations-email-whitelist'),
    await import('./scripts/geolocation'),
  ]

  try {
    await redis.connect()
    for (const script of scripts) {
      await script.exec({ prisma, redis })
    }
    process.exit(0)
  } catch {
    // Errors are logged in scripts executions
    process.exit(1)
  }
}

main()
