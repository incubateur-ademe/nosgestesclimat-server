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
  const hasOptedInForCommunications = req.body.hasOptedInForCommunications ?? ''

  try {
    const organizationFound = await Organization.findOne({
      'administrators.email': email,
    })

    if (!organizationFound) {
      return res.status(403).json('No matching organization found.')
    }

    if (organizationName) {
      organizationFound.name = organizationName
    }

    if (defaultAdditionalQuestions) {
      organizationFound.polls[0].defaultAdditionalQuestions =
        defaultAdditionalQuestions
    }

    const organizationSaved = await organizationFound.save()

    updateBrevoContact({
      email,
      name: administratorName,
      hasOptedInForCommunications,
    })

    setSuccessfulJSONResponse(res)

    res.json(organizationSaved)
  } catch (error) {
    return res.status(403).json(error)
  }
})

export default router
