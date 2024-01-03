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
router.route('/').post(async (req, res, next) => {
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
    res.json({ jwt: token, organization: organizationFound })
  } catch (error) {
    return next(error)
  }
})

/**
 * New simulation added to poll - any participant
 */
router.post('/add-simulation', async (req, res, next) => {
  const orgaSlug = req.body.slug
  const simulation = req.body.simulation
  const pollId = req.body.pollId || 0

  if (!orgaSlug || !simulation) {
    return next('Organization slug or simulation is/are missing.')
  }

  Organization.findOne({ slug: orgaSlug }, (error, organizationFound) => {
    if (error) {
      return next(error)
    }

    const pollIndex = organizationFound.polls.findIndex(
      (p) => p._id.toString() === pollId
    )

    organizationFound.polls[pollIndex].simulations.push(simulation)

    organizationFound.save((error, organizationSaved) => {
      if (error) {
        return next(error)
      }

      setSuccessfulJSONResponse(res)

      res.json(organizationSaved)

      console.log(
        'New simulation added to organization: ',
        organizationSaved.name
      )
    })
  })
})

/**
 * Fetching / updating by the owner
 * Needs to be authenticated and generates a new token at each request
 */

// Upon creation of the organization, validate the JWT
// to allow accessing the information form page
router.post('/validate-jwt', (req, res, next) => {
  const ownerEmail = req.body.ownerEmail

  // Authenticate the JWT
  try {
    authenticateToken({
      req,
      res,
      ownerEmail,
    })
    setSuccessfulJSONResponse(res)

    res.json('JWT validated.')
  } catch (error) {
    console.log('HERE', error)
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
    authenticateToken({
      req,
      res,
      ownerEmail,
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

router.post(`/:${orgaKey}`, (req, res, next) => {
  const orgaSlug = req.params[orgaKey]
  const ownerEmail = req.body.ownerEmail

  // Authenticate the JWT
  const newToken = authenticateToken({
    req,
    res,
    next,
    ownerEmail,
  })

  const errorMessage =
    'Unauthorized. A slug of the name of the organization must be provided.'

  if (!orgaSlug) {
    res.status(500).json({
      status: false,
      error: errorMessage,
    })

    return next(errorMessage)
  }

  connectdb.then(() => {
    // We get the matching organization if the owner email is correct
    const data = Organization.findOne({
      slug: orgaSlug,
      owner: { email: ownerEmail },
    })

    data.then((organization) => {
      setSuccessfulJSONResponse(res)

      res.json({
        organization,
        newToken,
      })
    })
  })
})

router.post(`/:${orgaKey}/update`, async (req, res, next) => {
  const orgaSlug = req.body.slug
  const ownerEmail = req.body.ownerEmail

  // Authenticate the JWT
  const newToken = authenticateToken({
    req,
    res,
    next,
    ownerEmail,
  })

  if (!orgaSlug || !ownerEmail) {
    return next('Error. A group id and a user id must be provided.')
  }

  Organization.findOne(
    {
      slug: orgaSlug,
      owner: { email: ownerEmail },
    },
    (error, organizationFound) => {
      if (error) {
        return next(error)
      }

      organizationFound.update((error, orgaUpdated) => {
        if (error) {
          return next(error)
        }

        setSuccessfulJSONResponse(res)

        console.log('Organization deleted')

        res.json({
          organization: orgaUpdated,
          newToken,
        })
      })
    }
  )
})

router.post(`/:${orgaKey}/delete`, async (req, res, next) => {
  const orgaSlug = req.body.slug
  const ownerEmail = req.body.ownerEmail

  // Authenticate the JWT
  authenticateToken({
    req,
    res,
    next,
    ownerEmail,
  })

  if (!orgaSlug || !ownerEmail) {
    return next('Error. A group id and a user id must be provided.')
  }

  Organization.findOne(
    {
      slug: orgaSlug,
      owner: { email: ownerEmail },
    },
    (error, organizationFound) => {
      if (error) {
        return next(error)
      }

      organizationFound.delete((error) => {
        if (error) {
          return next(error)
        }

        setSuccessfulJSONResponse(res)

        console.log('Organization deleted')

        res.json('Organization deleted')
      })
    }
  )
})

module.exports = router
