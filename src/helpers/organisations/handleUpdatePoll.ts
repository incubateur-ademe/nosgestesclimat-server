import { Document, RefType } from 'mongoose'
import { PollType } from '../../schemas/PollSchema'
import { SimulationType } from '../../schemas/SimulationSchema'
import { sendEmail } from '../email/sendEmail'
import {
  Organisation,
  OrganisationType,
} from '../../schemas/OrganisationSchema'
import { createOrUpdateContact } from '../email/createOrUpdateContact'
import { ATTRIBUTE_LAST_POLL_PARTICIPANTS_NUMBER } from '../../constants/brevo'

export async function handleUpdatePoll({
  poll,
  simulationSaved,
  email,
}: {
  poll?: Document<PollType> & PollType
  simulationSaved: Document<SimulationType> & SimulationType
  email: string
}) {
  if (!poll || poll.simulations.includes(simulationSaved._id as RefType)) {
    return
  }

  poll.simulations.push(simulationSaved._id as RefType)

  await poll.save()

  // Update number of participants on the administrators' Brevo contacts
  const organisationFound = (await Organisation.findOne({
    polls: poll._id,
  })) as Document<OrganisationType> & OrganisationType

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
  if (email) {
    const organisationFound = (await Organisation.findOne({
      polls: poll._id,
    })) as Document<OrganisationType> & OrganisationType

    await sendEmail({
      email,
      templateId: 71,
      params: {
        ORGANISATION_NAME: organisationFound?.name ?? '',
        DETAILED_VIEW_URL: `https://nosgestesclimat.fr/organisations/${organisationFound?.slug}/resultats-detailles`,
      },
    })
  }

  console.log(`Simulation saved in poll ${poll.slug}.`)
}
