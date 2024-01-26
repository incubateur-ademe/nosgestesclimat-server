import { Response } from 'express'
import { User } from '../../schemas/UserSchema'

export async function handleDeleteGroupForAllParticipants({
  groupId,
  res,
}: {
  groupId: string
  res: Response
}) {
  const users = await User.find({
    groups: {
      $elemMatch: groupId,
    },
  })

  if (!users) {
    return res.status(404).send('Error. No users found.')
  }

  users.forEach((user) => {
    user.groups = user.groups.filter((id) => id.toString() !== groupId)
  })

  await Promise.all(users.map((user) => user.save()))
}
