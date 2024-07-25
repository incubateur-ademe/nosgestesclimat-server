import express from 'express'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { Organisation } from '../../schemas/OrganisationSchema'
import { handleSendVerificationCodeAndReturnExpirationDate } from '../../helpers/verificationCode/handleSendVerificationCodeAndReturnExpirationDate'
import { validateEmail } from '../../utils/validation/validateEmail'
import { formatEmail } from '../../utils/formatting/formatEmail'

const router = express.Router()

router.post('/', async (req, res) => {
  const email = formatEmail(req.body.email)

  if (!email || !validateEmail(email)) {
    return res.status(403).json('A valid email address must be provided.')
  }

  try {
    const organisationFound = await Organisation.findOne({
      'administrators.email': email,
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
