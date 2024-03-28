import mongoose from 'mongoose'
import { config } from '../../config'
import { Organisation } from '../../schemas/OrganisationSchema'
import {
  ATTRIBUTE_IS_ORGANISATION_ADMIN,
  ATTRIBUTE_LAST_POLL_PARTICIPANTS_NUMBER,
  ATTRIBUTE_ORGANISATION_NAME,
  ATTRIBUTE_ORGANISATION_SLUG,
} from '../../constants/brevo'
import { createOrUpdateContact } from '../../helpers/email/createOrUpdateContact'

async function updateOrgaAdminContactAttributes() {
  mongoose.connect(config.mongo.url)

  try {
    const organisations = await Organisation.find().populate('polls')

    for (const organisation of organisations) {
      for (const administrator of organisation.administrators) {
        // Get the last poll updated
        const lastPollCreated = organisation.polls?.sort((a, b) => {
          return (b as any).createdAt.getTime() - (a as any).createdAt.getTime()
        })[0]

        console.log('updating orga admin contact attributes', {
          email: administrator.email,
          name: administrator.name,
          otherAttributes: {
            [ATTRIBUTE_IS_ORGANISATION_ADMIN]: true,
            [ATTRIBUTE_ORGANISATION_NAME]: organisation.name ?? undefined,
            [ATTRIBUTE_ORGANISATION_SLUG]: organisation.slug ?? undefined,
            [ATTRIBUTE_LAST_POLL_PARTICIPANTS_NUMBER]:
              lastPollCreated?.simulations?.length ?? 0,
          },
        })
        await createOrUpdateContact({
          email: administrator.email,
          name: administrator.name,
          otherAttributes: {
            [ATTRIBUTE_IS_ORGANISATION_ADMIN]: true,
            [ATTRIBUTE_ORGANISATION_NAME]: organisation.name ?? undefined,
            [ATTRIBUTE_ORGANISATION_SLUG]: organisation.slug ?? undefined,
            [ATTRIBUTE_LAST_POLL_PARTICIPANTS_NUMBER]:
              lastPollCreated?.simulations?.length ?? 0,
          },
        })

        await organisation.save()
      }
    }
  } catch (error) {
    console.error('Error updating orga admin contact attributes', error)
  }
}

updateOrgaAdminContactAttributes()
