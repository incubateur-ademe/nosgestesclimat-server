const express = require('express')

const Organization = require('../../schemas/OrganizationSchema')
const authenticateToken = require('../../helpers/middlewares/authentifyToken')
const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')

const router = express.Router()

/**
 * Fetching / updating by the owner
 * Needs to be authenticated and generates a new token at each request
 */
router.post('/', async (req, res) => {
  const ownerEmail = req.body.ownerEmail

  if (!ownerEmail) {
    return res.status(403).json('No owner email provided.')
  }

  // Authenticate the JWT
  try {
    authenticateToken({
      req,
      res,
      ownerEmail,
    })
  } catch (error) {
    res.status(403).json('Invalid token.')
    return
  }

  try {
    const organizationFound = await Organization.findOne({
      'administrator.email': ownerEmail,
    }).populate('administrator')

    setSuccessfulJSONResponse(res)

    res.json(organizationFound)
  } catch (error) {
    res.status(403).json('No organization found.')
  }
})

module.exports = router
