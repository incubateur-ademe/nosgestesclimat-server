const express = require('express')
const Organization = require('../../schemas/OrganizationSchema')
const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')
const handleSendVerificationCodeAndReturnExpirationDate = require('../../helpers/verificationCode/handleSendVerificationCodeAndReturnExpirationDate')
const getUserDocument = require('../../helpers/queries/getUserDocument')

const router = express.Router()

router.route('/').post(async (req, res, next) => {
  try {
    const ownerEmail = req.body.ownerEmail

    if (!ownerEmail) {
      return res.status(403).json('Error. An email address must be provided.')
    }

    const userDocument = getUserDocument({
      email: ownerEmail,
      name: '',
    })

    const organizationCreated = new Organization({
      owner: userDocument._id,
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
    return res.status(403).json(error)
  }
})

module.exports = router
