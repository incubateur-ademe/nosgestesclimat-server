const express = require('express')

const Organization = require('../../schemas/OrganizationSchema')
const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')
const authenticateToken = require('../../helpers/middlewares/authentifyToken')
const updateBrevoContact = require('../../helpers/email/updateBrevoContact')

const router = express.Router()

/**
 * Fetching / updating by the owner
 * Needs to be authenticated and generates a new token at each request
 */
router.post('/', async (req, res) => {
  const administratorEmail = req.body.administratorEmail

  if (!administratorEmail) {
    return res.status(401).send('Error. An email address must be provided.')
  }

  const organizationName = req.body.name
  const administratorName = req.body.administratorName
  const additionalQuestions = req.body.additionalQuestions
  const hasOptedInForCommunications = req.body.hasOptedInForCommunications ?? ''

  try {
    // Authenticate the JWT
    authenticateToken({
      req,
      res,
      email: administratorEmail,
    })

    const organizationFound = await Organization.findOne({
      'administrators.email': administratorEmail,
    })

    if (!organizationFound) {
      return res.status(403).json('No matching organization found.')
    }

    if (organizationName) {
      organizationFound.name = organizationName
    }

    if (additionalQuestions) {
      organizationFound.polls[0].additionalQuestions = additionalQuestions
    }

    const organizationSaved = await organizationFound.save()

    updateBrevoContact({
      email: administratorEmail,
      name: administratorName,
      hasOptedInForCommunications,
    })

    setSuccessfulJSONResponse(res)

    res.json(organizationSaved)
  } catch (error) {
    return res.status(403).json(error)
  }
})

module.exports = router
