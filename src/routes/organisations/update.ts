import {
  ATTRIBUTE_ORGANISATION_NAME,
  ATTRIBUTE_LAST_POLL_PARTICIPANTS_NUMBER,
  ATTRIBUTE_IS_ORGANISATION_ADMIN,
  ATTRIBUTE_ORGANISATION_SLUG,
} from './../../constants/brevo'
import express from 'express'

import { Organisation } from '../../schemas/OrganisationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { authentificationMiddleware } from '../../middlewares/authentificationMiddleware'
import { Poll, PollType } from '../../schemas/PollSchema'
import { findUniqueOrgaSlug } from '../../helpers/organisations/findUniqueOrgaSlug'
import { createOrUpdateContact } from '../../helpers/email/createOrUpdateContact'
import { HydratedDocument } from 'mongoose'
import { updateBrevoContactEmail } from '../../helpers/email/updateBrevoContactEmail'
import { generateAndSetNewToken } from '../../helpers/authentification/generateAndSetNewToken'
import { addOrUpdateContactToConnect } from '../../helpers/connect/addOrUpdateContactToConnect'
import { handleUpdateOrganisation } from '../../helpers/organisations/handleUpdateOrganisation'

const router = express.Router()

/**
 * Fetching / updating by the owner
 * Needs to be authenticated and generates a new token at each request
 */
router.use(authentificationMiddleware).post('/', async (req, res) => {
  const email = req.body.email?.toLowerCase()

  if (!email) {
    return res
      .status(401)
      .send('Error. A valid email address must be provided.')
  }

  const organisationName = req.body.name
  const administratorName = req.body.administratorName
  const hasOptedInForCommunications =
    req.body.hasOptedInForCommunications ?? false
  const position = req.body.position ?? ''
  const administratorTelephone = req.body.administratorTelephone ?? ''
  const organisationType = req.body.organisationType ?? ''
  const numberOfCollaborators = req.body.numberOfCollaborators ?? undefined

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
    await handleUpdateOrganisation({
      email,
      organisationName,
      administratorName,
      hasOptedInForCommunications,
      position,
      administratorTelephone,
      organisationType,
      numberOfCollaborators,
      uniqueSlug,
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

    if (administratorName || hasOptedInForCommunications !== undefined) {
      await createOrUpdateContact({
        email,
        name: administratorName,
        optin: hasOptedInForCommunications,
        otherAttributes: {
          [ATTRIBUTE_IS_ORGANISATION_ADMIN]: true,
          [ATTRIBUTE_ORGANISATION_NAME]: organisationFound.name,
          [ATTRIBUTE_ORGANISATION_SLUG]: organisationFound.slug,
          [ATTRIBUTE_LAST_POLL_PARTICIPANTS_NUMBER]:
            lastPoll?.simulations?.length ?? 0,
        },
      })
    }

    addOrUpdateContactToConnect({
      email,
      name: administratorName,
      position,
    })

    // Save the modifications
    const organisationSaved = await organisationFound.save()

    setSuccessfulJSONResponse(res)

    res.json(organisationSaved)
  } catch (error) {
    console.log('Error updating organisation', error)
    return res.status(403).json(error)
  }
})

export default router
