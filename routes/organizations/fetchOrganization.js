const express = require('express')

const Organization = require('../../schemas/OrganizationSchema')
const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')
const authenticateToken = require('../../helpers/middlewares/authentifyToken')

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
      ownerEmail,
    })

    let organizationFound
    try {
      organizationFound = await Organization.findOne({
        'owner.email': ownerEmail,
      })
    } catch (error) {
      return next(error)
    }

    setSuccessfulJSONResponse(res)

    res.json(organizationFound)
  } catch (error) {
    res.sendStatus(403)
  }
})

module.exports = router
