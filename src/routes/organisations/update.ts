import express from 'express'
import {
  ATTRIBUTE_IS_ORGANISATION_ADMIN,
  ATTRIBUTE_LAST_POLL_PARTICIPANTS_NUMBER,
  ATTRIBUTE_ORGANISATION_NAME,
  ATTRIBUTE_ORGANISATION_SLUG,
  MATOMO_CAMPAIGN_EMAIL_AUTOMATISE,
  MATOMO_CAMPAIGN_KEY,
  MATOMO_KEYWORD_KEY,
  MATOMO_KEYWORDS,
  TEMPLATE_ID_ORGANISATION_CREATED,
} from './../../constants/brevo'

import { HydratedDocument } from 'mongoose'
import { handleAddAttributes } from '../../helpers/brevo/handleAddAttributes'
import { addOrUpdateContactToConnect } from '../../helpers/connect/addOrUpdateContactToConnect'
import { createOrUpdateContact } from '../../helpers/email/createOrUpdateContact'
import { sendEmail } from '../../helpers/email/sendEmail'
import { findUniqueOrgaSlug } from '../../helpers/organisations/findUniqueOrgaSlug'
import { handleUpdateOrganisation } from '../../helpers/organisations/handleUpdateOrganisation'
import { authentificationMiddleware } from '../../middlewares/authentificationMiddleware'
import { Organisation } from '../../schemas/OrganisationSchema'
import { Poll, PollType } from '../../schemas/PollSchema'
import { formatEmail } from '../../utils/formatting/formatEmail'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'

const router = express.Router()

/**
 * Fetching / updating by the owner
 * Needs to be authenticated and generates a new token at each request
 */
router.use(authentificationMiddleware).post('/', async (req, res) => {
  const email = formatEmail(req.body.email)

  if (!email) {
    return res
      .status(401)
      .send('Error. A valid email address must be provided.')
  }

  const origin = req.get('origin') ?? 'https://nosgestesclimat.fr'
  const organisationName = req.body.name
  const administratorName = req.body.administratorName
  const hasOptedInForCommunications =
    req.body.hasOptedInForCommunications ?? false
  const position = req.body.position ?? ''
  const administratorTelephone = req.body.administratorTelephone ?? ''
  const organisationType = req.body.organisationType ?? ''
  const numberOfCollaborators = req.body.numberOfCollaborators ?? undefined
  const sendCreationEmail = req.body.sendCreationEmail ?? false

  try {
    const organisationFound = await Organisation.findOne({
      'administrators.email': email,
    }).populate('polls')

    if (!organisationFound) {
      return res.status(403).json('No matching organisation found.')
    }

    const uniqueSlug = !organisationFound.slug
      ? await findUniqueOrgaSlug(organisationName)
      : undefined

    // Handles all the update logic
    const organisationUpdated = await handleUpdateOrganisation({
      _id: organisationFound._id,
      administratorEmail: email,
      updates: {
        email,
        organisationName,
        administratorName,
        hasOptedInForCommunications,
        position,
        administratorTelephone,
        organisationType,
        numberOfCollaborators,
        uniqueSlug,
      },
    })

    const lastPoll =
      organisationFound.polls.length > 0
        ? await Poll.findById(
            (
              organisationFound.polls[
                organisationFound.polls.length - 1
              ] as unknown as HydratedDocument<PollType>
            )?._id
          )
        : undefined

    const otherAttributes = {
      [ATTRIBUTE_IS_ORGANISATION_ADMIN]: true,
      [ATTRIBUTE_ORGANISATION_NAME]: organisationUpdated?.name ?? '',
      [ATTRIBUTE_ORGANISATION_SLUG]: organisationUpdated?.slug,
      [ATTRIBUTE_LAST_POLL_PARTICIPANTS_NUMBER]:
        lastPoll?.simulations?.length ?? 0,
    }

    if (sendCreationEmail) {
      const templateId = TEMPLATE_ID_ORGANISATION_CREATED

      const dashBoardUrl = new URL(
        `${origin}/organisations/${organisationUpdated?.slug}`
      )
      const { searchParams } = dashBoardUrl
      searchParams.append(MATOMO_CAMPAIGN_KEY, MATOMO_CAMPAIGN_EMAIL_AUTOMATISE)
      searchParams.append(MATOMO_KEYWORD_KEY, MATOMO_KEYWORDS[templateId])

      const attributes = handleAddAttributes({
        name: administratorName,
        optin: hasOptedInForCommunications,
        otherAttributes,
      })

      await sendEmail({
        email,
        params: {
          ADMINISTRATOR_NAME: administratorName,
          ORGANISATION_NAME: organisationUpdated?.name ?? '',
          DASHBOARD_URL: dashBoardUrl.toString(),
        },
        templateId,
        attributes,
      })
    } else if (administratorName || hasOptedInForCommunications !== undefined) {
      await createOrUpdateContact({
        email,
        name: administratorName,
        optin: hasOptedInForCommunications,
        otherAttributes,
      })
    }

    addOrUpdateContactToConnect({
      email,
      name: administratorName,
      position,
    })

    setSuccessfulJSONResponse(res)

    res.json(organisationUpdated)
  } catch (error) {
    console.log('Error updating organisation', error)
    return res.status(403).json(error)
  }
})

export default router
