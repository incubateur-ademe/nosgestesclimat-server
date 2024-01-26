import express from 'express'

import { Organization } from '../../schemas/OrganizationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import authenticateToken from '../../helpers/authentification/authentifyToken'
import updateBrevoContact from '../../helpers/email/updateBrevoContact'

const router = express.Router()

router.post('/', async (req, res) => {
  const administratorEmail = req.body.administratorEmail
  const organizationName = req.body.name
  const slug = req.body.slug
  const administratorName = req.body.administratorName

  if (!organizationName || !slug || !administratorName) {
    return res
      .status(403)
      .json('Error. A name, a slug and an administrator name must be provided.')
  }

  if (!administratorEmail) {
    return res.status(403).json('Error. An email address must be provided.')
  }

  const administratorPosition = req.body.administratorPosition ?? ''
  const administratorTelephone = req.body.administratorTelephone ?? ''
  const numberOfParticipants = req.body.numberOfParticipants ?? ''
  const hasOptedInForCommunications = req.body.hasOptedInForCommunications ?? ''

  // Authenticate the JWT
  try {
    authenticateToken({
      req,
      res,
      email: administratorEmail,
    })
  } catch (error) {
    return res.status(403).json('Invalid token.')
  }

  try {
    const organizationFound = await Organization.findOne({
      'administrators.email': administratorEmail,
    })

    if (!organizationFound) {
      return res.status(403).json('No matching organization found.')
    }

    organizationFound.name = organizationName
    organizationFound.slug = slug
    organizationFound.administrators[0].name = administratorName
    organizationFound.administrators[0].position = administratorPosition
    organizationFound.administrators[0].telephone = administratorTelephone
    organizationFound.polls[0].expectedNumberOfParticipants =
      numberOfParticipants

    const organizationSaved = await organizationFound.save()

    updateBrevoContact({
      email: administratorEmail,
      name: administratorName,
      hasOptedInForCommunications,
    })

    setSuccessfulJSONResponse(res)

    res.json(organizationSaved)
  } catch (error) {
    return res.status(403).json(error)
  }
})

export default router
