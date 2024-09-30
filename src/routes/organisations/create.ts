import type { Request, Response } from 'express'
import express from 'express'
import { prisma } from '../../adapters/prisma/client'
import { handleSendVerificationCodeAndReturnExpirationDate } from '../../helpers/verificationCode/handleSendVerificationCodeAndReturnExpirationDate'
import logger from '../../logger'
import { Organisation } from '../../schemas/OrganisationSchema'
import { formatEmail } from '../../utils/formatting/formatEmail'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { validateEmail } from '../../utils/validation/validateEmail'

const router = express.Router()

router.route('/').post(async (req: Request, res: Response) => {
  try {
    const email = formatEmail(req.body.email)
    const userId = req.body.userId

    if (!email || !validateEmail(email)) {
      return res
        .status(403)
        .json('Error. A valid email address must be provided.')
    }

    // Check if an organisation with the same email already exists
    const organisation = await Organisation.findOne({
      'administrators.email': email,
    })

    if (organisation) {
      return res
        .status(500)
        .json("An organisation with this administrator's email already exists.")
    }

    const organisationCreated = new Organisation({
      administrators: [
        {
          email,
          userId,
        },
      ],
      polls: [],
    })

    // Save the organisation
    const [newlySavedOrganisation] = await Promise.all([
      organisationCreated.save(),
      prisma.verifiedUser
        .upsert({
          where: {
            email,
          },
          create: {
            id: userId,
            email,
          },
          update: {
            id: userId,
          },
        })
        .catch((error) =>
          logger.error('postgre Organisations replication failed', error)
        ),
    ])

    const verificationCodeObject =
      await handleSendVerificationCodeAndReturnExpirationDate({ email })

    newlySavedOrganisation.administrators[0].verificationCode =
      verificationCodeObject

    await newlySavedOrganisation.save()

    setSuccessfulJSONResponse(res)

    res.json({ expirationDate: verificationCodeObject.expirationDate })

    console.log('New organisation created')
  } catch (error) {
    console.log(error)
    return res.status(403).json(error)
  }
})

export default router
