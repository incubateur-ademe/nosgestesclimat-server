import express from 'express'

import { Organisation } from '../../schemas/OrganisationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { handleSendVerificationCodeAndReturnExpirationDate } from '../../helpers/verificationCode/handleSendVerificationCodeAndReturnExpirationDate'
import { validateEmail } from '../../utils/validation/validateEmail'

const router = express.Router()

router.route('/').post(async (req, res) => {
  try {
    const email = req.body.email

    if (!email || !validateEmail(email)) {
      return res
        .status(403)
        .json('Error. A valid email address must be provided.')
    }

    const organisationFound = await Organisation.findOne({
      administrators: { $elemMatch: { email } },
    })

    if (!organisationFound) {
      return res.status(403).json('No matching organisation found.')
    }

    const verificationCodeObject =
      await handleSendVerificationCodeAndReturnExpirationDate({ email })

    setSuccessfulJSONResponse(res)

    res.json({
      expirationDate: verificationCodeObject.expirationDate,
    })

    console.log('Login attempt, sent verification code.')
  } catch (error) {
    return res.status(403).json('No organisation found.')
  }
})

export default router
