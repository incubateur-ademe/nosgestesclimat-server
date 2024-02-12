import express from 'express'

import { Organization } from '../../schemas/OrganizationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { updateBrevoContact } from '../../helpers/email/updateBrevoContact'
import { authentificationMiddleware } from '../../middlewares/authentificationMiddleware'

const router = express.Router()

router.use(authentificationMiddleware).post('/', async (req, res) => {
  const email = req.body.email
  const organizationName = req.body.name
  const slug = req.body.slug
  const administratorName = req.body.administratorName

  if (!organizationName || !slug || !administratorName) {
    return res
      .status(403)
      .json('Error. A name, a slug and an administrator name must be provided.')
  }

  if (!email) {
    return res.status(403).json('Error. An email address must be provided.')
  }

  const administratorPosition = req.body.administratorPosition ?? ''
  const administratorTelephone = req.body.administratorTelephone ?? ''
  const numberOfParticipants = req.body.numberOfParticipants ?? ''
  const hasOptedInForCommunications = req.body.hasOptedInForCommunications ?? ''

  try {
    const organizationFound = await Organization.findOne({
      'administrators.email': email,
    })

    if (!organizationFound) {
      return res.status(403).send('No matching organization found.')
    }

    const administratorModifiedIndex =
      organizationFound.administrators.findIndex(
        ({ email: administratorEmail }) => administratorEmail === email
      )

    organizationFound.name = organizationName
    organizationFound.slug = slug
    organizationFound.administrators[administratorModifiedIndex].name =
      administratorName
    organizationFound.administrators[administratorModifiedIndex].position =
      administratorPosition
    organizationFound.administrators[administratorModifiedIndex].telephone =
      administratorTelephone
    organizationFound.administrators[
      administratorModifiedIndex
    ].hasOptedInForCommunications = hasOptedInForCommunications
    organizationFound.polls[0].expectedNumberOfParticipants =
      numberOfParticipants

    const organizationSaved = await organizationFound.save()

    updateBrevoContact({
      email,
      name: administratorName,
      hasOptedInForCommunications,
    })

    setSuccessfulJSONResponse(res)

    res.json(organizationSaved)
  } catch (error) {
    return res.status(500).json(error)
  }
})

export default router
