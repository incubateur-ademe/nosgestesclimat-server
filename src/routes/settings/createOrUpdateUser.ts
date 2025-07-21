import { prisma } from '../../adapters/prisma/client.js'
import { isValidEmail } from '../../core/typeguards/isValidEmail.js'

type Props = {
  userId: string
  email?: string
  name?: string
}

export async function createOrUpdateUser({ userId, email, name }: Props) {
  // If there is no userId we can't create a user
  if (!userId) {
    return
  }

  const emailUpdate = email && isValidEmail(email) ? { email } : {}
  const nameUpdate = typeof name === 'string' ? { name } : {}

  return await prisma.user.upsert({
    where: {
      id: userId,
    },
    create: {
      id: userId,
      ...emailUpdate,
      ...nameUpdate,
    },
    update: {
      id: userId,
      ...emailUpdate,
      ...nameUpdate,
    },
  })
}
