import {
  ATTRIBUTE_LAST_POLL_PARTICIPANTS_NUMBER,
  MATOMO_CAMPAIGN_EMAIL_AUTOMATISE,
  MATOMO_CAMPAIGN_KEY,
  MATOMO_KEYWORD_KEY,
  MATOMO_KEYWORDS,
  TEMPLATE_ID_ORGANISATION_JOINED,
} from '../../constants/brevo'
import { Organisation } from '../../schemas/OrganisationSchema'
import type { PollType } from '../../schemas/PollSchema'
import type { SimulationType } from '../../schemas/SimulationSchema'
import { createOrUpdateContact } from '../email/createOrUpdateContact'
import { sendEmail } from '../email/sendEmail'

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
  if (email) {
    const organisationFound = await Organisation.findOne({
      polls: poll._id,
    })

    const templateId = TEMPLATE_ID_ORGANISATION_JOINED

    const detailedViewUrl = new URL(
      `${origin}/organisations/${organisationFound?.slug}/resultats-detailles`
    )
    const { searchParams } = detailedViewUrl
    searchParams.append(MATOMO_CAMPAIGN_KEY, MATOMO_CAMPAIGN_EMAIL_AUTOMATISE)
    searchParams.append(MATOMO_KEYWORD_KEY, MATOMO_KEYWORDS[templateId])

    await sendEmail({
      email,
      templateId,
      params: {
        ORGANISATION_NAME: organisationFound?.name ?? '',
        DETAILED_VIEW_URL: detailedViewUrl.toString(),
      },
    })
  }

  console.log(`Simulation saved in poll ${poll.slug}.`)
}
