const express = require('express')
const connectdb = require('../scripts/initDatabase')
const Organization = require('../schemas/OrganizationSchema')
const { setSuccessfulJSONResponse } = require('../utils/setSuccessfulResponse')

const jwt = require('jsonwebtoken')
const authenticateToken = require('../helpers/middlewares/authentifyToken')
const handleSendVerificationCodeAndReturnExpirationDate = require('../helpers/verificationCode/handleSendVerificationCodeAndReturnExpirationDate')
const updateBrevoContact = require('../helpers/email/updateBrevoContact')

const router = express.Router()

const orgaKey = 'orgaSlug'

/**
 * Signin / Login
 */
router.route('/login').post(async (req, res, next) => {
  const ownerEmail = req.body.ownerEmail

  if (!ownerEmail) {
    return next('Error. An email address must be provided.')
  }

  try {
    const organizationFound = await Organization.findOne({
      'owner.email': ownerEmail,
    })

    if (!organizationFound) {
      return next('No organization found.')
    }

    const expirationDate =
      await handleSendVerificationCodeAndReturnExpirationDate({
        organization: organizationFound,
        ownerEmail,
      })

    setSuccessfulJSONResponse(res)

    const organizationUpdated = await Organization.findOne({
      'owner.email': ownerEmail,
    })

    res.json({
      expirationDate,
      organization: organizationUpdated,
    })

    console.log('Login attempt, sended verification code.')
  } catch (error) {
    return next(error)
  }
})

router.route('/create').post(async (req, res, next) => {
  const ownerEmail = req.body.ownerEmail

  if (!ownerEmail) {
    return next('Error. An email address must be provided.')
  }

  const organizationCreated = new Organization({
    owner: {
      email: ownerEmail,
    },
    polls: [
      {
        simulations: [],
      },
    ],
  })

  try {
    const organizationSaved = await organizationCreated.save()

    const expirationDate =
      await handleSendVerificationCodeAndReturnExpirationDate({
        organization: organizationSaved,
        ownerEmail,
      })

    setSuccessfulJSONResponse(res)

    res.json({ expirationDate })

    console.log('New organization created')
  } catch (error) {
    return next(error)
  }
})

/**
 * Verification code
 */
router.post('/send-verification-code', async (req, res, next) => {
  const ownerEmail = req.body.ownerEmail

  if (!ownerEmail) {
    return next('No email provided.')
  }

  const expirationDate =
    await handleSendVerificationCodeAndReturnExpirationDate()

  res.json({
    expirationDate,
  })

  console.log('Verification code sent.')
})

router.post('/validate-verification-code', async (req, res, next) => {
  const ownerEmail = req.body.ownerEmail
  const verificationCode = req.body.verificationCode

  if (!ownerEmail || !verificationCode) {
    return next('No email or verification code provided.')
  }

  try {
    const organizationFound = await Organization.findOne({
      'owner.email': ownerEmail,
    })

    // Validation of the code
    const now = new Date()

    if (organizationFound.verificationCode.code !== verificationCode) {
      return next('Invalid code.')
    }

    if (
      organizationFound.verificationCode.expirationDate.getTime() <
      now.getTime()
    ) {
      return next('Code expired.')
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
    return next(error)
  }
})

/**
 * Fetching / updating by the owner
 * Needs to be authenticated and generates a new token at each request
 */
router.post('/fetch-organization', async (req, res, next) => {
  const ownerEmail = req.body.ownerEmail

  if (!ownerEmail) {
    return next('No email provided.')
  }

  // Authenticate the JWT
  try {
    const newToken = authenticateToken({
      req,
      res,
      ownerEmail,
    })

    const organizationFound = await Organization.findOne({
      'owner.email': ownerEmail,
    })

    res.cookie('ngcjwt', newToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
    })

    setSuccessfulJSONResponse(res)

    res.json(organizationFound)
  } catch (error) {
    res.sendStatus(403)
  }
})

router.post('/update-after-creation', async (req, res, next) => {
  const ownerEmail = req.body.ownerEmail
  const name = req.body.name
  const slug = req.body.slug
  const ownerName = req.body.ownerName

  if (!name || !slug || !ownerName) {
    return next('Error. A name, a slug and an owner name must be provided.')
  }

  if (!ownerEmail) {
    return next('Error. An email address must be provided.')
  }

  const ownerPosition = req.body.ownerPosition ?? ''
  const ownerTelephone = req.body.ownerTelephone ?? ''
  const numberOfParticipants = req.body.numberOfParticipants ?? ''
  const hasOptedInForCommunications = req.body.hasOptedInForCommunications ?? ''

  try {
    // Authenticate the JWT
    const newToken = authenticateToken({
      req,
      res,
      ownerEmail,
    })

    res.cookie('ngcjwt', newToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
    })

    const organizationFound = await Organization.findOne({
      'owner.email': ownerEmail,
    })

    organizationFound.name = name
    organizationFound.slug = slug
    organizationFound.owner.name = ownerName
    organizationFound.owner.position = ownerPosition
    organizationFound.owner.telephone = ownerTelephone
    organizationFound.polls[0].numberOfParticipants = numberOfParticipants

    const organizationSaved = await organizationFound.save()

    updateBrevoContact({
      email: ownerEmail,
      ownerName,
      hasOptedInForCommunications,
    })

    setSuccessfulJSONResponse(res)

    res.json(organizationSaved)
  } catch (error) {
    return next(error)
  }
})

module.exports = router
