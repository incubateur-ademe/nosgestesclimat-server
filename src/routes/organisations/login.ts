import express from 'express'

import { Organisation } from '../../schemas/OrganisationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { handleSendVerificationCodeAndReturnExpirationDate } from '../../helpers/verificationCode/handleSendVerificationCodeAndReturnExpirationDate'

const router = express.Router()

router.route('/').post(async (req, res) => {
  try {
    const administratorEmail = req.body.administratorEmail

    const organisationUpdated = await Organisation.findOne({
      'administrators.email': administratorEmail,
    })

    if (!organisationUpdated) {
      return res.status(403).json('No matching organisation found.')
    }

    const expirationDate =
      await handleSendVerificationCodeAndReturnExpirationDate(
        administratorEmail
      )

    setSuccessfulJSONResponse(res)

    res.json({
      expirationDate,
      organisation: organisationUpdated,
    })

    console.log('Login attempt, sent verification code.')
  } catch (error) {
    return res.status(403).json('No organisation found.')
  }
})

export default router
