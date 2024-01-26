const express = require('express')
const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')
const OrganizationSchema = require('../../schemas/OrganizationSchema')
const handleSendVerificationCodeAndReturnExpirationDate = require('../../helpers/verificationCode/handleSendVerificationCodeAndReturnExpirationDate')

const router = express.Router()

router.post('/', async (req, res) => {
  const administratorEmail = req.body.administratorEmail

  if (!administratorEmail) {
    return res.status(403).json('No owner email provided.')
  }

  try {
    const organizationFound = await OrganizationSchema.findOne({
      'administrators.email': administratorEmail,
    })

    if (!organizationFound) {
      return res.status(403).json('No matching organization found.')
    }

    const verificationCodeObject =
      await handleSendVerificationCodeAndReturnExpirationDate(
        administratorEmail
      )

    organizationFound.administrators[0].verificationCode =
      verificationCodeObject

    await organizationFound.save()

    setSuccessfulJSONResponse(res)

    res.json({
      expirationDate: verificationCodeObject.expirationDate,
    })

    console.log('Verification code sent.')
  } catch (error) {
    return res.status(403).json("Une erreur s'est produite.")
  }
})

module.exports = router
