import { PrismaClient } from '@prisma/client'
import { redis } from '../src/adapters/redis/client.js'

const prisma = new PrismaClient()

const main = async () => {
  // Order matters here
  const scripts = [
    await import('./scripts/grant-roles.js'),
    await import('./scripts/add-integrations-api-scopes.js'),
    await import('./scripts/add-integrations-email-whitelist.js'),
    await import('./scripts/geolocation-sorted-ips.js'),
    await import('./scripts/geolocation-countries.js'),
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
