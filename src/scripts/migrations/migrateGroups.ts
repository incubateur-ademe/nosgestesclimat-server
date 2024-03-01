import mongoose from 'mongoose'
import { config } from '../../config'
import { getUserDocument } from '../../helpers/queries/getUserDocument'
import { Group } from '../../schemas/GroupSchema'
import { Simulation } from '../../schemas/SimulationSchema'

async function migrate() {
  console.log('In migrate function...')
  // 1 - Get all the groups that don't have an administrator
  try {
    console.log('Fetching groups...')
    mongoose.connect(config.mongo.url)

    const groups = await Group.find({ administrator: { $exists: false } })

    console.log('Groups length', groups.length)

    for (const group of groups) {
      const owner = group.owner
      const members = group.members ?? []

      if (!owner || !(members.length > 0)) {
        console.log('Group has no owner or members')
        continue
      }

      const ownerUser = await getUserDocument({
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
        const memberUserDocument = await getUserDocument({
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

      group.owner = undefined
      group.members = undefined

      const groupSaved = await group.save()

      console.log('Migrated group with name', groupSaved.name)
      console.log(groupSaved.administrator, groupSaved.participants)
    }
  } catch (e) {
    console.error('Error', e)
  }
}

console.log('Running migration...')
//@ts-ignore
migrate()
