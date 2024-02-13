import express from 'express'

import { Organisation } from '../../schemas/OrganisationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { updateBrevoContact } from '../../helpers/email/updateBrevoContact'
import { authentificationMiddleware } from '../../middlewares/authentificationMiddleware'

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

  try {
    const organisationFound = await Organisation.findOne({
      'administrators.email': email,
    })

    if (!organisationFound) {
      return res.status(403).json('No matching organisation found.')
    }

    // Handle modifications
    if (organisationName) {
      organisationFound.name = organisationName
    }

    const administratorModifiedIndex =
      organisationFound.administrators.findIndex(
        ({ email: administratorEmail }) => administratorEmail === email
      )

    if (administratorName && administratorModifiedIndex !== -1) {
      organisationFound.administrators[administratorModifiedIndex].name =
        administratorName
    }

    if (administratorModifiedIndex !== -1) {
      organisationFound.administrators[
        administratorModifiedIndex
      ].hasOptedInForCommunications = hasOptedInForCommunications
    }

    if (defaultAdditionalQuestions) {
      organisationFound.polls[0].defaultAdditionalQuestions =
        defaultAdditionalQuestions
    }

    // Save the modifications
    const organisationSaved = await organisationFound.save()

    if (administratorName || hasOptedInForCommunications !== undefined) {
      updateBrevoContact({
        email,
        name: administratorName,
        hasOptedInForCommunications,
      })
    }

    setSuccessfulJSONResponse(res)

    res.json(organisationSaved)
  } catch (error) {
    return res.status(403).json(error)
  }
})

export default router
