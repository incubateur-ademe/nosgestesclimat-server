const express = require('express')
const connectdb = require('../scripts/initDatabase')
const Organization = require('../schemas/OrganizationSchema')
const { setSuccessfulJSONResponse } = require('../utils/setSuccessfulResponse')
const generateRandomNumberWithLength = require('../utils/generateRandomNumberWithLength')
const {
  sendVerificationCode,
} = require('../helpers/email/sendVerificationCode')
const jwt = require('jsonwebtoken')
const authenticateToken = require('../helpers/middlewares/authentifyToken')
const dayjs = require('dayjs')

const router = express.Router()

const orgaKey = 'orgaSlug'

/**
 * Signin / Login
 */
router.post('/create', async (req, res, next) => {
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
        // startDate: new Date(),
        // endDate: new Date()
      },
    ],
  })

  organizationCreated.save((error, organizationSaved) => {
    if (error) {
      return next(error)
    }

    setSuccessfulJSONResponse(res)

    res.json(organizationSaved)

    console.log('New organization created')
  })
})

router.post('/send-verification-code', async (req, res, next) => {
  const ownerEmail = req.body.ownerEmail

  if (!ownerEmail) {
    return next('No email provided.')
  }

  Organization.findOne(
    { owner: { email: ownerEmail } },
    (error, organizationFound) => {
      if (error) {
        return next(error)
      }

      // Generate a random code
      const verificationCode = generateRandomNumberWithLength(6)

      organizationFound.verificationCode = {
        code: verificationCode,
        expirationDate: dayjs().add(1, 'hour').toDate(),
      }

      organizationFound.save((error, groupSaved) => {
        if (error) {
          return next(error)
        }

        // Send the code by email
        sendVerificationCode({
          email: ownerEmail,
          verificationCode,
          isSubscribedToNewsletter,
        })

        setSuccessfulJSONResponse(res)

        res.json(groupSaved)

        console.log('Verification email sent.')
      })
    }
  )
})

router.post('/validate-verification-code', async (req, res, next) => {
  const ownerEmail = req.body.ownerEmail
  const verificationCode = req.body.verificationCode

  if (!ownerEmail || !verificationCode) {
    return next('No email or verification code provided.')
  }

  Organization.findOne(
    { owner: { email: ownerEmail } },
    (error, organizationFound) => {
      if (error) {
        return next(error)
      }

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

      organizationFound.save(async (error, groupSaved) => {
        if (error) {
          return next(error)
        }

        const token = jwt.sign(ownerEmail, process.env.TOKEN_SECRET, {
          expiresIn: '15min',
        })

        setSuccessfulJSONResponse(res)

        res.json(token)
      })
    }
  )
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
