import mongoose from 'mongoose'
import { prisma } from '../../src/adapters/prisma/client'
import { config } from '../../src/config'
import { isValidEmail } from '../../src/core/typeguards/isValidEmail'
import logger from '../../src/logger'
import { Group } from '../../src/schemas/GroupSchema'
import { Simulation } from '../../src/schemas/SimulationSchema'
import { User } from '../../src/schemas/UserSchema'

type Props = {
  userId: string
  email?: string
  name?: string
}

async function createOrUpdateUser({ userId, email, name }: Props) {
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

async function migrate() {
  console.log('In migrate function...')
  // 1 - Get all the groups that don't have an administrator
  try {
    console.log('Fetching groups...')
    mongoose.connect(config.mongo.url)

    const groups = await Group.find({ administrator: { $exists: false } })

    console.log('Groups length', groups.length)

    for (const group of groups) {
      // @ts-expect-error 2339 old schema is gone
      const { owner, members = [] } = group

      if (!owner || !(members.length > 0)) {
        console.log('Group has no owner or members')
        continue
      }

      const ownerUser = await createOrUpdateUser({
        email: owner?.email,
        userId: owner?.userId ?? '',
        name: owner?.name,
      })

      // 2 - For each group, create or get the User document for the owner
      // and create a reference to it in the group in the administrator field
      group.administrator = {
        name: ownerUser?.name ?? '',
        userId: ownerUser?.userId ?? '',
        email: ownerUser?.email,
      }

      for (const member of members) {
        const memberUserDocument = await createOrUpdateUser({
          email: member.email,
          userId: member.userId,
          name: owner?.name,
        })

        const simulationCreated = new Simulation({
          user: memberUserDocument?._id,
          id: member?.simulation?.id,
          actionChoices: member?.simulation?.actionChoices,
          date: member?.simulation?.date ?? new Date(),
          foldedSteps: member?.simulation?.foldedSteps,
          situation: member?.simulation?.situation,
          progression: 1,
          group: group._id,
        })

        const simulationSaved = await simulationCreated.save()

        // 3 - Then, for each member, create or get the User document for the member
        // whether it has an email provided or not and create a reference to it in a new Simulation document
        // which can then be referenced in the group in the participants field along with the name of the member
        group.participants.push({
          name: member.name,
          email: memberUserDocument?.email,
          userId: memberUserDocument?.userId ?? '',
          simulation: simulationSaved._id,
        })
      }

      // @ts-expect-error 2339 old schema is gone
      group.owner = undefined
      // @ts-expect-error 2339 & 2322 old schema is gone & cannot unset like that
      group.members = undefined

      const groupSaved = await group.save()

      console.log('Migrated group with name', groupSaved.name)
      console.log(groupSaved.administrator, groupSaved.participants)
    }
    console.log('Groups migrated')
  } catch (e) {
    console.error('Error', e)
  }
}

console.log('Running migration...')
migrate()
