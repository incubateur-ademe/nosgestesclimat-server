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
  let userDocument

  // If there is no userId we can't create a user
  if (!userId) {
    return
  }

  userDocument = await User.findOne({ userId })

  // If not, we create a new one
  if (!userDocument) {
    const newUser = new User({
      name,
      email,
      userId,
    })

    userDocument = await newUser.save()
  }

  //If it exists, we update it with the new name and email
  if (email && userDocument.email !== email) {
    userDocument.email = email
  }
  if (name && userDocument.name !== name) {
    userDocument.name = name
  }

  await Promise.all([
    userDocument.save(),
    prisma.user
      .upsert({
        where: {
          id: userId,
        },
        create: {
          id: userId,
          name,
          ...(email && isValidEmail(email) ? { email } : {}),
        },
        update: {
          id: userId,
          name,
          ...(email && isValidEmail(email) ? { email } : {}),
        },
      })
      .catch((error) =>
        logger.error('postgre Users replication failed', error)
      ),
  ])

  return userDocument
}
