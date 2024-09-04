import { isValidEmail } from '../../core/typeguards/isValidEmail'
import type { GroupType } from '../../schemas/GroupSchema'
import type { SimulationType } from '../../schemas/SimulationSchema'
import type { UserType } from '../../schemas/UserSchema'
import { sendGroupEmail } from '../email/sendGroupEmail'
import { handleUpdateGroupNumberOneParticipant } from './handleUpdateNumberGroupOneParticipant'

type Props = {
  group?: GroupType
  userDocument: UserType
  simulationSaved: SimulationType
  origin: string
}
export async function handleUpdateGroup({
  group,
  userDocument,
  simulationSaved,
  origin,
}: Props) {
  // If there is no group, we do nothing
  if (!group) {
    return
  }

  const participantWithSimulation = group.participants.find(
    (participant) => participant.userId === userDocument.userId
  )

  // If the user is already in the group, we update their simulation
  if (participantWithSimulation) {
    participantWithSimulation.simulation = simulationSaved._id
    await group.save()
    console.log(`Simulation updated in group ${group.name}.`)
    return
  }

  // Otherwise, we add the user (and its simulation) to the group
  group.participants.push({
    name: userDocument.name || '🦊',
    email: userDocument.email,
    userId: userDocument.userId,
    simulation: simulationSaved._id,
  })

  const groupSaved = await group.save()

  // createOrUpdateContact in brevo will raise otherwise
  if (isValidEmail(groupSaved.administrator?.email)) {
    // Update the number of group with one participant of the administrator
    await handleUpdateGroupNumberOneParticipant({
      group: groupSaved,
    })
  }

  console.log(
    `User and simulation saved in group ${group._id} (${group.name}).`
  )

  // Send creation confirmation email to the participant (if an email is provided)
  sendGroupEmail({
    group,
    userId: userDocument.userId,
    name: userDocument.name,
    email: userDocument.email,
    isCreation: false,
    origin,
  })
}
