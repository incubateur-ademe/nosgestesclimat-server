import express from 'express'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { Organisation } from '../../schemas/OrganisationSchema'
import { handleSendVerificationCodeAndReturnExpirationDate } from '../../helpers/verificationCode/handleSendVerificationCodeAndReturnExpirationDate'
import { validateEmail } from '../../utils/validation/validateEmail'

const router = express.Router()

router.post('/', async (req, res) => {
  const email = req.body.email?.toLowerCase()?.trim()
  const previousEmail = req.body.previousEmail?.toLowerCase()?.trim()

  if (
    !email ||
    !validateEmail(email) ||
    !previousEmail ||
    !validateEmail(previousEmail)
  ) {
    return res.status(403).json('A valid email address must be provided.')
  }

  try {
    const organisationFound = await Organisation.findOne({
      'administrators.email': previousEmail,
    })

    if (!organisationFound) {
      return res.status(403).json('No matching organisation found.')
    }

    const verificationCodeObject =
      await handleSendVerificationCodeAndReturnExpirationDate({ email })

    organisationFound.administrators[0].verificationCode =
      verificationCodeObject

    await organisationFound.save()

    setSuccessfulJSONResponse(res)

    res.json({
      expirationDate: verificationCodeObject.expirationDate,
    })

    console.log('Verification code sent.')
  } catch (error) {
    return res.status(403).json("Une erreur s'est produite.")
  }
})

export default router
