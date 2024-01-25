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

    if (!administratorEmail) {
      return res.status(403).json('Error. An email address must be provided.')
    }

    const organizationCreated = new Organization({
      administrators: [
        {
          email: administratorEmail,
        },
      ],
      polls: [
        {
          simulations: [],
        },
      ],
    })

    await organizationCreated.save()

    const expirationDate =
      await handleSendVerificationCodeAndReturnExpirationDate(
        administratorEmail
      )

    setSuccessfulJSONResponse(res)

    res.json({ expirationDate })

    console.log('New organization created')
  } catch (error) {
    return res.status(403).json(error)
  }
})

module.exports = router
