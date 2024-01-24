const Group = require('../../schemas/GroupSchema')
const getUserDocument = require('../../helpers/queries/getUserDocument')
const Simulation = require('../../schemas/SimulationSchema').Simulation

const run = async () => {
  // 1 - Get all the groups that don't have an administrator
  const groups = await Group.find({ administrator: { $exists: false } })

  for (const group of groups) {
    const owner = group.owner
    const members = group.members

    const ownerUser = await getUserDocument({
      email: owner.email,
      name: owner.name,
    })
    const ownerUserId = ownerUser._id

    // 2 - For each group, create or get the User document for the owner
    // and create a reference to it in the group in the administrator field
    group.administrator = ownerUserId

    for (const member of members) {
      const memberUser = await getUserDocument({
        email: member.email,
        name: owner.name,
      })

      const memberUserId = memberUser._id

      const simulation = new Simulation({
        userId: memberUserId,
        actionChoices: member.simulation.actionChoices,
        config: member.simulation.config,
        date: member.simulation.date,
        foldedSteps: member.simulation.foldedSteps,
        hiddenNotifications: member.simulation.hiddenNotifications,
        situation: member.simulation.situation,
        unfoldedStep: member.simulation.unfoldedStep,
        computedResults: member.simulation.computedResults,
      })

      const simulationId = simulation._id

      // 3 - Then, for each member, create or get the User document for the member
      // whether it has an email provided or not and create a reference to it in a new Simulation document
      // which can then be referenced in the group in the participants field along with the name of the member
      group.participants.push({
        name: member.name,
        simulation: simulationId,
      })
    }

    group.owner = undefined
    group.members = undefined

    await group.save()
  }
}

run()
