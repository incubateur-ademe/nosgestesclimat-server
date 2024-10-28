import mongoose from 'mongoose'
import { config } from '../../src/config'
import {
  ATTRIBUTE_IS_ORGANISATION_ADMIN,
  ATTRIBUTE_LAST_POLL_PARTICIPANTS_NUMBER,
  ATTRIBUTE_ORGANISATION_NAME,
  ATTRIBUTE_ORGANISATION_SLUG,
} from '../../src/constants/brevo'
import { createOrUpdateContact } from '../../src/helpers/email/createOrUpdateContact'
import type { OrganisationType } from '../../src/schemas/OrganisationSchema'
import { Organisation } from '../../src/schemas/OrganisationSchema'
import type { PollType } from '../../src/schemas/PollSchema'

type PopulatedOrganisation = Omit<OrganisationType, 'polls'> & {
  polls: PollType[]
}

export async function updateOrgaAdminContactAttributes() {
  try {
    mongoose.connect(config.mongo.url)

    const organisations = await Organisation.find(
      {}
    ).populate<PopulatedOrganisation>('polls')

    for (const organisation of organisations) {
      for (const administrator of organisation.administrators) {
        // Get the last poll updated
        const [lastPollCreated] = organisation.polls?.sort((a, b) => {
          return b.createdAt.getTime() - a.createdAt.getTime()
        })

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
            [ATTRIBUTE_ORGANISATION_NAME]: organisation.name ?? '',
            [ATTRIBUTE_ORGANISATION_SLUG]: organisation.slug ?? '',
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
