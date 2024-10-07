import type { Document } from 'mongoose'
import { sendSimulationUpsertedEmail } from '../../adapters/brevo/client'
import { ListIds } from '../../adapters/brevo/constant'
import type { SimulationType } from '../../schemas/SimulationSchema'
import type { UserType } from '../../schemas/UserSchema'
import { createOrUpdateContact } from './createOrUpdateContact'

/**
 * Send an email to a user when they save a simulation at the end
 */

type Props = {
  userDocument: Document<UserType> & UserType
  simulationSaved: Document<SimulationType> & SimulationType
  shouldSendSimulationEmail: boolean
  origin: string
}
export async function sendSimulationEmail({
  userDocument,
  simulationSaved,
  shouldSendSimulationEmail,
  origin,
}: Props) {
  const { email, userId } = userDocument

  // If no email is provided, we don't do anything
  if (!email) {
    return
  }

  // If we should not send the email, we don't do anything
  if (!shouldSendSimulationEmail) {
    return
  }

  const isSimulationCompleted = simulationSaved.progression === 1

  // Create or update the contact
  await createOrUpdateContact({
    email,
    userId,
    listIds: [
      isSimulationCompleted
        ? ListIds.END_SIMULATION
        : ListIds.UNFINISHED_SIMULATION,
    ],
    optin: true,
  })

  await sendSimulationUpsertedEmail({
    email,
    origin,
    simulation: {
      id: simulationSaved.id,
      progression: simulationSaved.progression!,
    },
  })

  console.log(`Simulation email sent to ${email}`)
}
