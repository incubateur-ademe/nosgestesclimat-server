import express from 'express'

import { Organization } from '../../schemas/OrganizationSchema'
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

  const organizationName = req.body.name
  const administratorName = req.body.administratorName
  const defaultAdditionalQuestions = req.body.defaultAdditionalQuestions
  const hasOptedInForCommunications =
    req.body.hasOptedInForCommunications ?? false

  try {
    const organizationFound = await Organization.findOne({
      'administrators.email': email,
    })

    if (!organizationFound) {
      return res.status(403).json('No matching organization found.')
    }

    // Handle modifications
    if (organizationName) {
      organizationFound.name = organizationName
    }

    const administratorModifiedIndex =
      organizationFound.administrators.findIndex(
        ({ email: administratorEmail }) => administratorEmail === email
      )

    if (administratorName && administratorModifiedIndex !== -1) {
      organizationFound.administrators[administratorModifiedIndex].name =
        administratorName
    }

    if (administratorModifiedIndex !== -1) {
      organizationFound.administrators[
        administratorModifiedIndex
      ].hasOptedInForCommunications = hasOptedInForCommunications
    }

    if (defaultAdditionalQuestions) {
      organizationFound.polls[0].defaultAdditionalQuestions =
        defaultAdditionalQuestions
    }

    // Save the modifications
    const organizationSaved = await organizationFound.save()

    if (administratorName || hasOptedInForCommunications !== undefined) {
      updateBrevoContact({
        email,
        name: administratorName,
        hasOptedInForCommunications,
      })
    }

    setSuccessfulJSONResponse(res)

    res.json(organizationSaved)
  } catch (error) {
    return res.status(403).json(error)
  }
})

export default router
