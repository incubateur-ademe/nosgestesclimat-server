import { sendPollSimulationUpsertedEmail } from '../../adapters/brevo/client'
import { ATTRIBUTE_LAST_POLL_PARTICIPANTS_NUMBER } from '../../constants/brevo'
import { Organisation } from '../../schemas/OrganisationSchema'
import type { PollType } from '../../schemas/PollSchema'
import type { SimulationType } from '../../schemas/SimulationSchema'
import { createOrUpdateContact } from '../email/createOrUpdateContact'

export async function handleUpdatePoll({
  poll,
  simulationSaved,
  email,
  origin,
}: {
  poll?: PollType
  simulationSaved: SimulationType
  email: string
  origin: string
}) {
  if (!poll || poll.simulations.includes(simulationSaved._id)) {
    return
  }

  poll.simulations.push(simulationSaved._id)

  await poll.save()

  // Update number of participants on the administrators' Brevo contacts
  const organisationFound = await Organisation.findOne({
    polls: poll._id,
  })

  if (organisationFound) {
    const administrators = organisationFound.administrators
    for (const administrator of administrators) {
      await createOrUpdateContact({
        email: administrator.email,
        userId: administrator.userId,
        otherAttributes: {
          [ATTRIBUTE_LAST_POLL_PARTICIPANTS_NUMBER]: poll.simulations.length,
        },
      })
    }
  }

  // Send confirmation email
  if (email && simulationSaved.progression === 1) {
    const organisationFound = await Organisation.findOne({
      polls: poll._id,
    })

    await sendPollSimulationUpsertedEmail({
      email,
      origin,
      organisation: {
        name: organisationFound!.name ?? '',
        slug: organisationFound!.slug!,
      },
    })
  }

  console.log(`Simulation saved in poll ${poll.slug}.`)
}
