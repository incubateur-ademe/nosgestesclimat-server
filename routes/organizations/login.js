const express = require('express')

const Organization = require('../../schemas/OrganizationSchema')
const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')
const handleSendVerificationCodeAndReturnExpirationDate = require('../../helpers/verificationCode/handleSendVerificationCodeAndReturnExpirationDate')

const router = express.Router()

router.route('/').post(async (req, res) => {
  try {
    const administratorEmail = req.body.administratorEmail

    const organizationUpdated = await Organization.findOne({
      'administrators.email': administratorEmail,
    })

    if (!organizationUpdated) {
      return res.status(403).json('No matching organization found.')
    }

    const expirationDate =
      await handleSendVerificationCodeAndReturnExpirationDate(
        administratorEmail
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
