import { User } from '../../schemas/UserSchema'

type Props = {
  email: string
  userId: string
  name?: string
}

export async function getUserDocument({ email, userId, name }: Props) {
  let userDocument

  try {
    // Check if user already exists
    userDocument = await User.findOne({ $or: [{ email }, { userId }] })
  } catch (error) {
    // Do nothing
  }

  // If not, create it
  if (!userDocument) {
    const newUser = new User({
      name,
      email,
      userId,
    })

    userDocument = await newUser.save()

    return userDocument
  }
}
