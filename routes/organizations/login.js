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
      'administrator.email': ownerEmail,
    }).populate('administrator')

    if (!organizationUpdated) {
      return res.status(403).json('No matching organization found.')
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
    return res.status(403).json('No organization found.')
  }
})

module.exports = router
