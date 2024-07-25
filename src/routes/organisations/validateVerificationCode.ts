import jwt from 'jsonwebtoken'
import express from 'express'

import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { Organisation } from '../../schemas/OrganisationSchema'
import { config } from '../../config'
import { COOKIES_OPTIONS, COOKIE_MAX_AGE } from '../../constants/cookies'
import { formatEmail } from '../../utils/formatting/formatEmail'
import { handleVerificationCodeValidation } from '../../helpers/organisations/handleVerificationCodeValidation'

const router = express.Router()

router.post('/', async (req, res) => {
  const email = formatEmail(req.body.email)
  const verificationCode = req.body.verificationCode

  if (!email || !verificationCode) {
    return res.status(403).json('No email or verification code provided.')
  }

  try {
    await handleVerificationCodeValidation({
      verificationCode,
      res,
      email,
    })

    const token = jwt.sign({ email }, config.security.jwt.secret, {
      expiresIn: COOKIE_MAX_AGE,
    })

    setSuccessfulJSONResponse(res)

    res.cookie('ngcjwt', token, COOKIES_OPTIONS)

    const organisation = await Organisation.findOne({
      'administrators.email': email,
    })

    res.json(organisation)
  } catch (error) {
    console.log('error', error)
    return res.status(403).json(error)
  }
})

export default router
