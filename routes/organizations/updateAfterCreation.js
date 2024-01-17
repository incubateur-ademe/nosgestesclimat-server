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
router.post('/', async (req, res, next) => {
  const ownerEmail = req.body.ownerEmail
  const name = req.body.name
  const slug = req.body.slug
  const ownerName = req.body.ownerName

  if (!name || !slug || !ownerName) {
    return res
      .status(403)
      .json('Error. A name, a slug and an owner name must be provided.')
  }

  if (!ownerEmail) {
    return res.status(403).json('Error. An email address must be provided.')
  }

  const ownerPosition = req.body.ownerPosition ?? ''
  const ownerTelephone = req.body.ownerTelephone ?? ''
  const numberOfParticipants = req.body.numberOfParticipants ?? ''
  const hasOptedInForCommunications = req.body.hasOptedInForCommunications ?? ''

  // Authenticate the JWT
  try {
    authenticateToken({
      req,
      res,
      next,
      ownerEmail,
    })
  } catch (error) {
    return res.status(403).json('Invalid token.')
  }

  try {
    const organizationFound = await Organization.findOne({
      'owner.email': ownerEmail,
    })

    if (!organizationFound) {
      return res.status(403).json('No matching organization found.')
    }

    organizationFound.name = name
    organizationFound.slug = slug
    organizationFound.owner.name = ownerName
    organizationFound.owner.position = ownerPosition
    organizationFound.owner.telephone = ownerTelephone
    organizationFound.polls[0].numberOfParticipants = numberOfParticipants

    const organizationSaved = await organizationFound.save()

    updateBrevoContact({
      email: ownerEmail,
      ownerName,
      hasOptedInForCommunications,
    })

    setSuccessfulJSONResponse(res)

    res.json(organizationSaved)
  } catch (error) {
    return res.status(403).json(error)
  }
})

module.exports = router
