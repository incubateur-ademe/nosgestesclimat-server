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
  const administratorEmail = req.body.administratorEmail

  if (!administratorEmail) {
    return res.status(403).json('No owner email provided.')
  }

  // Authenticate the JWT
  try {
    authenticateToken({
      req,
      res,
      email: administratorEmail,
    })
  } catch (error) {
    res.status(403).json('Invalid token.')
    return
  }

  try {
    const organizationFound = await Organization.findOne({
      'administrators.email': administratorEmail,
    })

    setSuccessfulJSONResponse(res)

    res.json(organizationFound)
  } catch (error) {
    res.status(403).json('No organization found.')
  }
})

module.exports = router
