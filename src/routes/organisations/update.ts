import {
  ATTRIBUTE_ORGANISATION_NAME,
  ATTRIBUTE_LAST_POLL_PARTICIPANTS_NUMBER,
} from './../../constants/brevo'
import express from 'express'
import slugify from 'slugify'

import { Organisation } from '../../schemas/OrganisationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { authentificationMiddleware } from '../../middlewares/authentificationMiddleware'
import { Poll } from '../../schemas/PollSchema'
import { findUniqueSlug } from '../../helpers/organisations/findUniqueSlug'
import { createOrUpdateContact } from '../../helpers/email/createOrUpdateContact'

const router = express.Router()

/**
 * Fetching / updating by the owner
 * Needs to be authenticated and generates a new token at each request
 */
router.use(authentificationMiddleware).post('/', async (req, res) => {
  const email = req.body.email

  if (!email) {
    return res.status(401).send('Error. An email address must be provided.')
  }

  const organisationName = req.body.name
  const administratorName = req.body.administratorName
  const defaultAdditionalQuestions = req.body.defaultAdditionalQuestions
  const hasOptedInForCommunications =
    req.body.hasOptedInForCommunications ?? false
  const expectedNumberOfParticipants = req.body.expectedNumberOfParticipants
  const administratorPosition = req.body.administratorPosition ?? ''
  const administratorTelephone = req.body.administratorTelephone ?? ''

  try {
    const organisationFound = await Organisation.findOne({
      'administrators.email': email,
    }).populate('polls')

    if (!organisationFound) {
      return res.status(403).json('No matching organisation found.')
    }

    if (organisationName) {
      organisationFound.name = organisationName
    }

    if (!organisationFound.slug) {
      const uniqueSlug = await findUniqueSlug(
        slugify(organisationName.toLowerCase())
      )

      organisationFound.slug = uniqueSlug
    }

    const administratorModifiedIndex =
      organisationFound.administrators.findIndex(
        ({ email: administratorEmail }) => administratorEmail === email
      )

    if (administratorName && administratorModifiedIndex !== -1) {
      organisationFound.administrators[administratorModifiedIndex].name =
        administratorName
    }

    if (administratorPosition && administratorModifiedIndex !== -1) {
      organisationFound.administrators[administratorModifiedIndex].position =
        administratorPosition
    }

    if (administratorTelephone && administratorModifiedIndex !== -1) {
      organisationFound.administrators[administratorModifiedIndex].position =
        administratorTelephone
    }

    if (administratorModifiedIndex !== -1) {
      organisationFound.administrators[
        administratorModifiedIndex
      ].hasOptedInForCommunications = hasOptedInForCommunications
    }

    const pollUpdated = await Poll.findById(organisationFound.polls[0]._id)

    if (pollUpdated && defaultAdditionalQuestions) {
      pollUpdated.defaultAdditionalQuestions = defaultAdditionalQuestions
    }

    if (pollUpdated && expectedNumberOfParticipants) {
      pollUpdated.expectedNumberOfParticipants = expectedNumberOfParticipants
    }

    if (
      pollUpdated &&
      (defaultAdditionalQuestions || expectedNumberOfParticipants)
    ) {
      await pollUpdated.save()
    }

    // Save the modifications
    await organisationFound.save()

    if (administratorName || hasOptedInForCommunications !== undefined) {
      await createOrUpdateContact({
        email,
        name: administratorName,
        optin: hasOptedInForCommunications,
        otherAttributes: {
          ATTRIBUTE_IS_ORGANISATION_ADMIN: true,
          ATTRIBUTE_ORGANISATION_NAME: organisationName,
          ATTRIBUTE_LAST_POLL_PARTICIPANTS_NUMBER:
            pollUpdated?.simulations?.length ?? 0,
        },
      })
    }

    setSuccessfulJSONResponse(res)

    const organisationResult = await Organisation.findOne({
      'administrators.email': email,
    }).populate('polls')

    res.json(organisationResult)
  } catch (error) {
    return res.status(403).json(error)
  }
})

export default router
