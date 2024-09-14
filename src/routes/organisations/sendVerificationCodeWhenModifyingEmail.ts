import express from 'express'
import { handleSendVerificationCodeAndReturnExpirationDate } from '../../helpers/verificationCode/handleSendVerificationCodeAndReturnExpirationDate'
import { Organisation } from '../../schemas/OrganisationSchema'
import { formatEmail } from '../../utils/formatting/formatEmail'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { validateEmail } from '../../utils/validation/validateEmail'

const router = express.Router()

router.post('/', async (req, res) => {
  const email = formatEmail(req.body.email)
  const previousEmail = formatEmail(req.body.previousEmail)

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
    console.warn(error)
    return res.status(403).json("Une erreur s'est produite.")
  }
})

/**
 * @deprecated should use features/authentication instead
 */
export default router
