const express = require('express')
const findOrganizationAndSendVerificationCode = require('../../helpers/findOrganizationAndSendVerificationCode')
const Organization = require('../../schemas/OrganizationSchema')
const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')

const router = express.Router()

router.route('/').post(async (req, res, next) => {
  try {
    const ownerEmail = req.body.ownerEmail

    const organizationUpdated = await Organization.findOne({
      'owner.email': ownerEmail,
    }).populate()

    if (!organizationUpdated) {
      return next('No matching organization found.')
    }

    const expirationDate = await findOrganizationAndSendVerificationCode(
      req,
      next
    )

    setSuccessfulJSONResponse(res)

    res.json({
      expirationDate,
      organization: organizationUpdated,
    })

    console.log('Login attempt, sent verification code.')
  } catch (error) {
    return next(error)
  }
})

module.exports = router
