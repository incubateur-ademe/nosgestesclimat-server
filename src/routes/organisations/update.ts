import express from 'express'

import type { VerifiedUser } from '@prisma/client'
import type { HydratedDocument } from 'mongoose'
import { sendOrganisationCreatedEmail } from '../../adapters/brevo/client'
import { Attributes } from '../../adapters/brevo/constant'
import { addOrUpdateContact } from '../../adapters/connect/client'
import { handleAddAttributes } from '../../helpers/brevo/handleAddAttributes'
import { createOrUpdateContact } from '../../helpers/email/createOrUpdateContact'
import { findUniqueOrgaSlug } from '../../helpers/organisations/findUniqueOrgaSlug'
import { handleUpdateOrganisation } from '../../helpers/organisations/handleUpdateOrganisation'
import { authentificationMiddleware } from '../../middlewares/authentificationMiddleware'
import { Organisation } from '../../schemas/OrganisationSchema'
import type { PollType } from '../../schemas/PollSchema'
import { Poll } from '../../schemas/PollSchema'
import { formatEmail } from '../../utils/formatting/formatEmail'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'

const router = express.Router()

/**
 * Fetching / updating by the owner
 * Needs to be authenticated and generates a new token at each request
 */
router.use(authentificationMiddleware()).post('/', async (req, res) => {
  const email = formatEmail(req.body.email)

  if (!email) {
    return res
      .status(401)
      .send('Error. A valid email address must be provided.')
  }

  const origin = req.get('origin') ?? 'https://nosgestesclimat.fr'
  const organisationName = req.body.name
  const administratorName = req.body.administratorName
  const hasOptedInForCommunications =
    req.body.hasOptedInForCommunications ?? false
  const position = req.body.position ?? ''
  const administratorTelephone = req.body.administratorTelephone ?? ''
  const organisationType = req.body.organisationType ?? ''
  const numberOfCollaborators = req.body.numberOfCollaborators ?? undefined
  const sendCreationEmail = req.body.sendCreationEmail ?? false

  try {
    const organisationFound = await Organisation.findOne({
      'administrators.email': email,
    }).populate('polls')

    if (!organisationFound) {
      return res.status(403).json('No matching organisation found.')
    }

    const uniqueSlug =
      organisationFound.slug || (await findUniqueOrgaSlug(organisationName))

    // Handles all the update logic
    const organisationUpdated = await handleUpdateOrganisation({
      _id: organisationFound._id,
      administratorEmail: email,
      updates: {
        email,
        organisationName,
        administratorName,
        hasOptedInForCommunications,
        position,
        administratorTelephone,
        organisationType,
        numberOfCollaborators,
        uniqueSlug,
      },
    })

    const lastPoll =
      organisationFound.polls.length > 0
        ? await Poll.findById(
            (
              organisationFound.polls[
                organisationFound.polls.length - 1
              ] as unknown as HydratedDocument<PollType>
            )?._id
          )
        : undefined

    const otherAttributes = {
      [Attributes.IS_ORGANISATION_ADMIN]: true,
      [Attributes.ORGANISATION_NAME]: organisationUpdated?.name ?? '',
      [Attributes.ORGANISATION_SLUG]: organisationUpdated?.slug,
      [Attributes.LAST_POLL_PARTICIPANTS_NUMBER]:
        lastPoll?.simulations?.length ?? 0,
    }

    if (sendCreationEmail) {
      const attributes = handleAddAttributes({
        name: administratorName,
        optin: hasOptedInForCommunications,
        otherAttributes,
      })

      await createOrUpdateContact({
        email,
        otherAttributes: attributes,
      })

      await sendOrganisationCreatedEmail({
        origin,
        administrator: {
          name: administratorName,
          email,
        },
        organisation: {
          name: organisationUpdated?.name ?? '',
          slug: organisationUpdated!.slug!,
        },
      })
    } else if (administratorName || hasOptedInForCommunications !== undefined) {
      await createOrUpdateContact({
        email,
        name: administratorName,
        optin: hasOptedInForCommunications,
        otherAttributes,
      })
    }

    addOrUpdateContact({
      email,
      name: administratorName,
      position,
    } as VerifiedUser)

    setSuccessfulJSONResponse(res)

    res.json(organisationUpdated)
  } catch (error) {
    console.log('Error updating organisation', error)
    return res.status(403).json(error)
  }
})

/**
 * @deprecated should use features/organisations instead
 */
export default router
