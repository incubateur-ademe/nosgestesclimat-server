import express from 'express'

import { Organisation } from '../../schemas/OrganisationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { authentificationMiddleware } from '../../middlewares/authentificationMiddleware'
import { updateBrevoContactEmail } from '../../helpers/email/updateBrevoContactEmail'
import { generateAndSetNewToken } from '../../helpers/authentification/generateAndSetNewToken'
import axios from 'axios'
import { handleVerificationCodeValidation } from '../../helpers/organisations/handleVerificationCodeValidation'
import { handleUpdateOrganisation } from '../../helpers/organisations/handleUpdateOrganisation'
import { formatEmail } from '../../utils/formatting/formatEmail'

const router = express.Router()

/**
 * Fetching / updating by the owner
 * Needs to be authenticated and generates a new token at each request
 */
router.use(authentificationMiddleware).post('/', async (req, res) => {
  const email = formatEmail(req.body.email)
  const emailModified = formatEmail(req.body.emailModified)

  if (!email || !emailModified) {
    return res
      .status(401)
      .send('Error. Valid email addresses must be provided.')
  }

  const organisationName = req.body.name
  const administratorName = req.body.administratorName
  const hasOptedInForCommunications =
    req.body.hasOptedInForCommunications ?? false
  const position = req.body.position ?? ''
  const organisationType = req.body.organisationType ?? ''
  const numberOfCollaborators = req.body.numberOfCollaborators ?? undefined
  const verificationCode = req.body.verificationCode
  const administratorTelephone = req.body.administratorTelephone ?? ''

  try {
    await handleVerificationCodeValidation({
      verificationCode,
      res,
      email: emailModified,
    })

    const organisationFound = await Organisation.findOne({
      'administrators.email': email,
    })

    if (!organisationFound) {
      return res.status(403).json('No matching organisation found.')
    }

    const organisationUpdated = await handleUpdateOrganisation({
      _id: organisationFound._id,
      administratorEmail: email,
      updates: {
        email: emailModified,
        organisationName,
        administratorName,
        hasOptedInForCommunications,
        position,
        organisationType,
        numberOfCollaborators,
        administratorTelephone,
      },
    })

    if (emailModified && email !== emailModified) {
      // Update the Brevo contact
      updateBrevoContactEmail({
        email,
        emailModified,
      }).catch((error) => {
        console.log('Error updating Brevo contact', error)
      })

      generateAndSetNewToken(res, emailModified)
    }

    setSuccessfulJSONResponse(res)

    res.json(organisationUpdated)
  } catch (error) {
    console.log('Error updating organisation', error)
    return res.status(403).json(error)
  }
})

export default router
