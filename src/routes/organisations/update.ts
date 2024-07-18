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
  const emailModified = req.body.emailModified

  try {
    const organisationFound = await Organisation.findOne({
      'administrators.email': email,
    }).populate('polls')

    if (!organisationFound) {
      return res.status(403).json('No matching organisation found.')
    }

    if (organisationName) {
      organisationFound.name = String(organisationName)
    }

    if (!organisationFound.slug) {
      const uniqueSlug = await findUniqueOrgaSlug(organisationName)

      organisationFound.slug = uniqueSlug
    }

    const administratorModifiedIndex =
      organisationFound.administrators.findIndex(
        ({ email: administratorEmail }) => administratorEmail === email
      )

    // Return if no matching administrator found
    if (administratorModifiedIndex === -1) {
      return res.status(403).json('No matching administrator found.')
    }

    if (administratorName) {
      organisationFound.administrators[administratorModifiedIndex].name =
        administratorName
    }

    if (position && administratorModifiedIndex !== -1) {
      organisationFound.administrators[administratorModifiedIndex].position =
        position
    }

    if (administratorTelephone) {
      organisationFound.administrators[administratorModifiedIndex].telephone =
        administratorTelephone
    }

    organisationFound.administrators[
      administratorModifiedIndex
    ].hasOptedInForCommunications = hasOptedInForCommunications

    if (organisationType) {
      organisationFound.organisationType = organisationType
    }

    if (numberOfCollaborators) {
      organisationFound.numberOfCollaborators = numberOfCollaborators
    }

    if (emailModified && emailModified !== email) {
      organisationFound.administrators[administratorModifiedIndex].email =
        emailModified

      // Update the Brevo contact
      await updateBrevoContactEmail({
        email,
        emailModified,
      })

      // TODO : update the CONNECT contact

      generateAndSetNewToken(res, emailModified)
    }

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
        // If the email was modified, use the new email
        email: emailModified ?? email,
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
