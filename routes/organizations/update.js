const express = require('express')

const Organization = require('../../schemas/OrganizationSchema')
const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')
const authenticateToken = require('../../helpers/middlewares/authentifyToken')
const updateBrevoContact = require('../../helpers/email/updateBrevoContact')
const { UserModel } = require('../../schemas/UserSchema')

const router = express.Router()

/**
 * Fetching / updating by the owner
 * Needs to be authenticated and generates a new token at each request
 */
router.post('/', async (req, res, next) => {
  const ownerEmail = req.body.ownerEmail

  if (!ownerEmail) {
    return next('Error. An email address must be provided.')
  }

  const name = req.body.name
  const ownerName = req.body.ownerName
  const additionalQuestions = req.body.additionalQuestions
  const hasOptedInForCommunications = req.body.hasOptedInForCommunications ?? ''

  try {
    // Authenticate the JWT
    authenticateToken({
      req,
      res,
      ownerEmail,
    })

    const organizationFound = await Organization.findOne({
      'owner.email': ownerEmail,
    })

    if (!organizationFound) {
      return next('No matching organization found.')
    }

    if (name) {
      organizationFound.name = name
    }

    if (additionalQuestions) {
      organizationFound.polls[0].additionalQuestions = additionalQuestions
    }

    // Update the owner User document
    let ownerUserDocument
    if (ownerName || hasOptedInForCommunications) {
      ownerUserDocument = await UserModel.findOne({
        email: ownerEmail,
      })

      if (ownerName) {
        ownerUserDocument.name = ownerName
      }

      if (hasOptedInForCommunications) {
        ownerUserDocument.hasOptedInForCommunications =
          hasOptedInForCommunications
      }

      await ownerUserDocument.save()
    }

    const organizationSaved = await organizationFound.save()

    updateBrevoContact({
      email: ownerEmail,
      ownerName,
      hasOptedInForCommunications,
    })

    setSuccessfulJSONResponse(res)

    res.json(organizationSaved)
  } catch (error) {
    return next(error)
  }
})

module.exports = router
