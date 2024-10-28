import mongoose from 'mongoose'
import { config } from '../../src/config'
import { Organisation } from '../../src/schemas/OrganisationSchema'
import {
  ATTRIBUTE_IS_ORGANISATION_ADMIN,
  ATTRIBUTE_LAST_POLL_PARTICIPANTS_NUMBER,
  ATTRIBUTE_ORGANISATION_NAME,
  ATTRIBUTE_ORGANISATION_SLUG,
} from '../../src/constants/brevo'
import { Poll, PollType } from '../../src/schemas/PollSchema'
import { createOrUpdateContact } from '../../src/helpers/email/createOrUpdateContact'

export async function updateOrgaAdminContactAttributes() {
  try {
    mongoose.connect(config.mongo.url)
    const poll = new Poll({
      simulations: [],
    })

    const organisations = await Organisation.find({}).populate('polls')

    for (const organisation of organisations) {
      for (const administrator of organisation.administrators) {
        // Get the last poll updated
        const lastPollCreated = organisation.polls?.sort((a, b) => {
          return (b as any).createdAt.getTime() - (a as any).createdAt.getTime()
        })[0] as unknown as PollType

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
  } finally {
    mongoose.disconnect()
    process.exit(0)
  }
}

updateOrgaAdminContactAttributes()
