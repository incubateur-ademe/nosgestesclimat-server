import { prisma } from '../../adapters/prisma/client'
import { isValidEmail } from '../../core/typeguards/isValidEmail'
import logger from '../../logger'
import { User } from '../../schemas/UserSchema'

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

  const userDocument = await User.findOneAndUpdate(
    { userId },
    {
      userId,
      ...emailUpdate,
      ...nameUpdate,
    },
    { upsert: true, new: true }
  )

  try {
    await prisma.user.upsert({
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
  } catch (error) {
    logger.error('postgre Users replication failed', error)
  }

  return userDocument
}
