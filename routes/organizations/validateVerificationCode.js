const jwt = require('jsonwebtoken')
const express = require('express')

const Organization = require('../../schemas/OrganizationSchema')
const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')

const router = express.Router()

router.post('/', async (req, res, next) => {
  const ownerEmail = req.body.ownerEmail
  const verificationCode = req.body.verificationCode

  if (!ownerEmail || !verificationCode) {
    return res.status(403).json('No email or verification code provided.')
  }

  try {
    const organizationFound = await Organization.findOne({
      'owner.email': ownerEmail,
    })

    // Validation of the code
    const now = new Date()

    if (organizationFound.verificationCode.code !== verificationCode) {
      return res.status(403).json('Invalid code.')
    }

    if (
      organizationFound.verificationCode.expirationDate.getTime() <
      now.getTime()
    ) {
      return res.status(403).json('Code expired.')
    }

    const token = jwt.sign({ ownerEmail }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    })

    setSuccessfulJSONResponse(res)

    res.cookie('ngcjwt', token, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
    })

    res.json(organizationFound)
  } catch (error) {
    return res.status(403).json(error)
  }
})

module.exports = router
