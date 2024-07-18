import jwt, { Secret } from 'jsonwebtoken'
import express from 'express'

import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { VerificationCode } from '../../schemas/VerificationCodeSchema'
import { Organisation } from '../../schemas/OrganisationSchema'
import { config } from '../../config'
import { COOKIES_OPTIONS, COOKIE_MAX_AGE } from '../../constants/cookies'
import { validateVerificationCode } from '../../helpers/organisations/validateVerificationCode'

const router = express.Router()

router.post('/', async (req, res) => {
  const email = req.body.email?.toLowerCase()
  const verificationCode = req.body.verificationCode

  if (!email || !verificationCode) {
    return res.status(403).json('No email or verification code provided.')
  }

  try {
    await validateVerificationCode({
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
