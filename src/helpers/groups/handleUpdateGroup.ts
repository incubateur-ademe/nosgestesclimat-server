import { prisma } from '../../adapters/prisma/client'
import { isValidEmail } from '../../core/typeguards/isValidEmail'
import { createParticipantAndUser } from '../../features/groups/groups.repository'
import type {
  ActionChoicesSchema,
  ComputedResultSchema,
  SimulationCreateDto,
  SimulationCreateUser,
} from '../../features/simulations/simulations.validator'
import logger from '../../logger'
import type { GroupType } from '../../schemas/GroupSchema'
import type { SimulationType } from '../../schemas/SimulationSchema'
import type { UserType } from '../../schemas/UserSchema'
import { sendGroupEmail } from '../email/sendGroupEmail'
import { getSimulationAdditionalQuestionsAnswers } from '../queries/createOrUpdateSimulation'
import { handleUpdateGroupNumberOneParticipant } from './handleUpdateNumberGroupOneParticipant'

type Props = {
  group?: GroupType
  userDocument: UserType
  simulationSaved: SimulationType
  origin: string
}

const mapSimulation = (
  simulation: SimulationType,
  user: SimulationCreateUser
): SimulationCreateDto => ({
  id: simulation.id,
  actionChoices: (simulation.actionChoices as ActionChoicesSchema) || {},
  computedResults: simulation.computedResults as ComputedResultSchema,
  date: simulation.date || new Date(),
  foldedSteps: simulation.foldedSteps,
  progression: simulation.progression || 0,
  savedViaEmail: !!simulation.savedViaEmail,
  situation: simulation.situation,
  additionalQuestionsAnswers:
    getSimulationAdditionalQuestionsAnswers(simulation),
  user,
})

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
    await Promise.all([
      group.save(),
      prisma.groupParticipant
        .update({
          where: {
            groupId_userId: {
              groupId: group._id.toString(),
              userId: participantWithSimulation.userId,
            },
          },
          data: {
            simulationId: simulationSaved.id.toString(),
          },
        })
        .catch((error) =>
          logger.error('postgre Groups replication failed', error)
        ),
    ])
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

  const [groupSaved] = await Promise.all([
    group.save(),
    createParticipantAndUser(
      {
        groupId: group._id.toString(),
      },
      {
        name: userDocument.name || '🦊',
        userId: userDocument.userId,
        simulation: mapSimulation(simulationSaved, {
          id: userDocument.userId,
          email: userDocument.email,
          name: userDocument.name,
        }),
        ...(userDocument.email && isValidEmail(userDocument.email)
          ? { email: userDocument.email }
          : {}),
      }
    ).catch((error) =>
      logger.error('postgre Groups replication failed', error)
    ),
  ])

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
  if (simulationSaved.progression === 1) {
    await sendGroupEmail({
      group,
      userId: userDocument.userId,
      name: userDocument.name,
      email: userDocument.email,
      isCreation: false,
      origin,
    })
  }
}
