import jwt, { Secret } from 'jsonwebtoken'
import express from 'express'

import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { VerificationCode } from '../../schemas/VerificationCodeSchema'
import { Organisation } from '../../schemas/OrganisationSchema'
import { config } from '../../config'
import { COOKIES_OPTIONS, COOKIE_MAX_AGE } from '../../constants/cookies'

const router = express.Router()

router.post('/', async (req, res) => {
  const email = req.body.email?.toLowerCase()
  const verificationCode = req.body.verificationCode

  if (!email || !verificationCode) {
    return res.status(403).json('No email or verification code provided.')
  }

  try {
    const verificationCodeFound = await VerificationCode.findOne(
      {
        email,
      },
      {},
      { sort: { createdAt: -1 } }
    )

    if (!verificationCodeFound) {
      return res.status(403).json('No matching verification code found.')
    }

    // Validation of the code
    const now = new Date()

    if (verificationCodeFound.toObject().code !== verificationCode) {
      return res.status(403).json('Invalid code.')
    }

    if (
      verificationCodeFound.toObject().expirationDate.getTime() < now.getTime()
    ) {
      return res.status(403).json('Code expired.')
    }

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
