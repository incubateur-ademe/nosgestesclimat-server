import { getUserDocument } from '../../helpers/queries/getUserDocument'
import { computeResults } from "./migrateGroups/computeResults"

const Group = require('../../schemas/GroupSchema')

const Simulation = require('../../schemas/SimulationSchema').Simulation

const run = async () => {
  // 1 - Get all the groups that don't have an administrator
  const groups = await Group.find({ administrator: { $exists: false } })

  for (const group of groups) {
    const owner = group.owner
    const members = group.members

    const ownerUser = await getUserDocument({
      email: owner.email,
      userId: owner.userId,
      name: owner.name,
    })

    // 2 - For each group, create or get the User document for the owner
    // and create a reference to it in the group in the administrator field
    group.administrator = ownerUser?.userId

    for (const member of members) {
      const memberUserDocument = await getUserDocument({
        email: member.email,
        userId: member.userId,
        name: owner.name,
      })


      const simulationCreated = new Simulation({
        user: memberUserDocument?._id,
        id: member.simulation.id,
        actionChoices: member.simulation.actionChoices,
        date: member.simulation.date,
        foldedSteps: member.simulation.foldedSteps,
        situation: member.simulation.situation,
        unfoldedStep: member.simulation.unfoldedStep,
        progression: 1,
        group: group._id,
        computedResults: computeResults(member.simulation.situation),
      })

      const simulationSaved = await simulationCreated.save()

      // 3 - Then, for each member, create or get the User document for the member
      // whether it has an email provided or not and create a reference to it in a new Simulation document
      // which can then be referenced in the group in the participants field along with the name of the member
      group.participants.push({
        name: member.name,
        userId: memberUserDocument?.userId,
        simulation: simulationSaved._id,
      })
    }

    group.owner = undefined
    group.members = undefined

    await group.save()
  }
}

run()
