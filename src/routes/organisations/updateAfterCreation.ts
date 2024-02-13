import express from 'express'

import { Organisation } from '../../schemas/OrganisationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { updateBrevoContact } from '../../helpers/email/updateBrevoContact'
import { authentificationMiddleware } from '../../middlewares/authentificationMiddleware'

const router = express.Router()

router.use(authentificationMiddleware).post('/', async (req, res) => {
  const email = req.body.email
  const organisationName = req.body.name
  const slug = req.body.slug
  const administratorName = req.body.administratorName

  if (!organisationName || !slug || !administratorName) {
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
    const organisationFound = await Organisation.findOne({
      'administrators.email': email,
    })

    if (!organisationFound) {
      return res.status(403).send('No matching organisation found.')
    }

    const administratorModifiedIndex =
      organisationFound.administrators.findIndex(
        ({ email: administratorEmail }) => administratorEmail === email
      )

    organisationFound.name = organisationName
    organisationFound.slug = slug
    organisationFound.administrators[administratorModifiedIndex].name =
      administratorName
    organisationFound.administrators[administratorModifiedIndex].position =
      administratorPosition
    organisationFound.administrators[administratorModifiedIndex].telephone =
      administratorTelephone
    organisationFound.administrators[
      administratorModifiedIndex
    ].hasOptedInForCommunications = hasOptedInForCommunications
    organisationFound.polls[0].expectedNumberOfParticipants =
      numberOfParticipants

    const organisationSaved = await organisationFound.save()

    updateBrevoContact({
      email,
      name: administratorName,
      hasOptedInForCommunications,
    })

    setSuccessfulJSONResponse(res)

    res.json(organisationSaved)
  } catch (error) {
    return res.status(500).json(error)
  }
})

export default router
