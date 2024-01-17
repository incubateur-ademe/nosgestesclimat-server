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
router.post('/', async (req, res, next) => {
  const ownerEmail = req.body.ownerEmail

  if (!ownerEmail) {
    return next('No email provided.')
  }
  // Authenticate the JWT
  try {
    authenticateToken({
      req,
      res,
      next,
      ownerEmail,
    })
  } catch (error) {
    return next(error)
  }

  try {
    const organizationFound = await Organization.findOne({
      'owner.email': ownerEmail,
    })

    setSuccessfulJSONResponse(res)

    res.json(organizationFound)
  } catch (error) {
    res.sendStatus(403).json('No organization found.')
  }
})

module.exports = router
