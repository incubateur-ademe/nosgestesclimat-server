import jwt, { Secret } from 'jsonwebtoken'
import express from 'express'

import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { VerificationCode } from '../../schemas/VerificationCodeSchema'
import { Organization } from '../../schemas/OrganizationSchema'

const router = express.Router()

router.post('/', async (req, res) => {
  const administratorEmail = req.body.administratorEmail
  const verificationCode = req.body.verificationCode

  if (!administratorEmail || !verificationCode) {
    return res.status(403).json('No email or verification code provided.')
  }

  try {
    const verificationCodeFound = await VerificationCode.findOne({
      email: administratorEmail,
    })

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

    const token = jwt.sign(
      { email: administratorEmail },
      process.env.JWT_SECRET as Secret,
      {
        expiresIn: '1d',
      }
    )

    setSuccessfulJSONResponse(res)

    res.cookie('ngcjwt', token, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
    })

    const organization = await Organization.findOne({
      'administrators.email': administratorEmail,
    })

    res.json(organization)
  } catch (error) {
    return res.status(403).json(error)
  }
})

export default router
