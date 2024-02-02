import { Response } from 'express'

import { User } from '../../schemas/UserSchema'

type Props = {
  groupId: string
  email: string
  userId: string
  res: Response
}

export async function handleDeleteGroupForUser({
  groupId,
  email,
  userId,
  res,
}: Props) {
  // Delete the groupID from the participant's list of groups
  const userFound = await User.findOne({
    $or: [
      {
        email,
      },
      {
        userId,
      },
    ],
  })

  if (!userFound) {
    return res.status(404).send('Error. User not found.')
  }

  userFound.groups =
    userFound.groups?.filter((id) => id && id.toString() !== groupId) || []

  await userFound.save()
}
