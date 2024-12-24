import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const main = async () => {
  const scripts = [await import('./scripts/grant-roles')]

  try {
    await scripts.reduce(
      (prom, script) => prom.then(() => script.exec(prisma)),
      Promise.resolve()
    )
    process.exit(0)
  } catch {
    // Errors are logged in scripts executions
    process.exit(1)
  }
}

main()
