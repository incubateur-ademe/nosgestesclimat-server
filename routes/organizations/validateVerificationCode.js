const jwt = require('jsonwebtoken')
const express = require('express')

const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')
const VerificationCodeSchema = require('../../schemas/VerificationCodeSchema')

const router = express.Router()

router.post('/', async (req, res) => {
  const administratorEmail = req.body.administratorEmail
  const verificationCode = req.body.verificationCode

  if (!administratorEmail || !verificationCode) {
    return res.status(403).json('No email or verification code provided.')
  }

  try {
    const verificationCodeFound = await VerificationCodeSchema.findOne({
      email: administratorEmail,
    })

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
      process.env.JWT_SECRET,
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

    res.json('Successfully logged in.')
  } catch (error) {
    return res.status(403).json(error)
  }
})

module.exports = router
