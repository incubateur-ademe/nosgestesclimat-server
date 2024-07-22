import express from 'express'

import { Organisation } from '../../schemas/OrganisationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { authentificationMiddleware } from '../../middlewares/authentificationMiddleware'
import { updateBrevoContactEmail } from '../../helpers/email/updateBrevoContactEmail'
import { generateAndSetNewToken } from '../../helpers/authentification/generateAndSetNewToken'
import axios from 'axios'
import { validateVerificationCode } from '../../helpers/organisations/validateVerificationCode'

const router = express.Router()

/**
 * Fetching / updating by the owner
 * Needs to be authenticated and generates a new token at each request
 */
router.use(authentificationMiddleware).post('/', async (req, res) => {
  const email = req.body.email?.toLowerCase()?.trim()
  const emailModified = req.body.emailModified?.toLowerCase()?.trim()

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

  try {
    await validateVerificationCode({
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

    if (organisationName) {
      organisationFound.name = String(organisationName)
    }

    const administratorModifiedIndex =
      organisationFound.administrators.findIndex(
        ({ email: administratorEmail }) => administratorEmail === email
      )

    // Return if no matching administrator found
    if (administratorModifiedIndex === -1) {
      return res.status(403).json('No matching administrator found.')
    }

    if (administratorName) {
      organisationFound.administrators[administratorModifiedIndex].name =
        administratorName
    }

    if (position && administratorModifiedIndex !== -1) {
      organisationFound.administrators[administratorModifiedIndex].position =
        position
    }

    organisationFound.administrators[
      administratorModifiedIndex
    ].hasOptedInForCommunications = hasOptedInForCommunications

    if (organisationType) {
      organisationFound.organisationType = organisationType
    }

    if (numberOfCollaborators) {
      organisationFound.numberOfCollaborators = numberOfCollaborators
    }

    if (emailModified && email !== emailModified) {
      organisationFound.administrators[administratorModifiedIndex].email =
        emailModified

      // Update the Brevo contact
      updateBrevoContactEmail({
        email,
        emailModified,
      }).catch((error) => {
        console.log('Error updating Brevo contact', error)
      })

      generateAndSetNewToken(res, emailModified)
    }

    console.log('organisationFound', organisationFound)

    // Save the modifications
    const organisationSaved = await organisationFound.save()

    setSuccessfulJSONResponse(res)

    res.json(organisationSaved)
  } catch (error) {
    console.log('Error updating organisation', error)
    return res.status(403).json(error)
  }
})

export default router
