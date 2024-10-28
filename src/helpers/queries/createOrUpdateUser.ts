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

  try {
    // Check if user already exists (based on userId)
    userDocument = await User.findOne({ userId })
  } catch (error) {
    // Do nothing
  }

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
  await userDocument.save()

  return userDocument
}
