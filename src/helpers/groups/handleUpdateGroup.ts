import { Document, RefType } from 'mongoose'
import { SimulationType } from '../../schemas/SimulationSchema'
import { GroupType } from '../../schemas/GroupSchema'
import { UserType } from '../../schemas/UserSchema'

export async function handleUpdateGroup({
  group,
  userDocument,
  simulationSaved,
}: {
  group?: Document<GroupType> & GroupType
  userDocument: Document<UserType> & UserType
  simulationSaved: Document<SimulationType> & SimulationType
}) {
  // If there is no group, we do nothing
  if (!group) {
    return
  }

  const participantWithSimulation = group.participants.find(
    (participant) => participant.userId === userDocument.userId
  )

  // If the user is already in the group, we update their simulation
  if (participantWithSimulation) {
    participantWithSimulation.simulation = simulationSaved._id as RefType
    await group.save()
    console.log(`Simulation updated in group ${group.name}.`)
    return
  }

  // Otherwise, we add the user (and its simulation) to the group
  group.participants.push({
    name: userDocument.name,
    email: userDocument.email,
    userId: userDocument.userId,
    simulation: simulationSaved._id as RefType,
  })

  await group.save()

  console.log(
    `User and simulation saved in group ${group._id} (${group.name}).`
  )
}
