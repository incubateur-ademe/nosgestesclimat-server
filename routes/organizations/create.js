const express = require('express')
const Organization = require('../../schemas/OrganizationSchema')
const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')
const handleSendVerificationCodeAndReturnExpirationDate = require('../../helpers/verificationCode/handleSendVerificationCodeAndReturnExpirationDate')

const router = express.Router()

router.route('/create').post(async (req, res, next) => {
  try {
    const ownerEmail = req.body.ownerEmail

    if (!ownerEmail) {
      return next('Error. An email address must be provided.')
    }

    const organizationCreated = new Organization({
      owner: {
        email: ownerEmail,
      },
      polls: [
        {
          simulations: [],
        },
      ],
    })

    await organizationCreated.save()

    const expirationDate =
      await handleSendVerificationCodeAndReturnExpirationDate({
        ownerEmail,
        next,
      })

    setSuccessfulJSONResponse(res)

    res.json({ expirationDate })

    console.log('New organization created')
  } catch (error) {
    return next(error)
  }
})

module.exports = router
