import { Organisation } from '../../../src/schemas/OrganisationSchema'
import mongoose from 'mongoose'
import { config } from '../../../src/config'
import { updateEmailOfContact } from '../../../src/helpers/email/updateEmailOfContact'
import { createOrUpdateContact } from '../../../src/helpers/email/createOrUpdateContact'
import { formatEmail } from '../../../src/utils/formatting/formatEmail'

async function formatEmailContainingUppercase() {
  try {
    mongoose.connect(config.mongo.url)

    const organisations = await Organisation.find({
      'administrators.email': { $regex: /[A-Z]/ },
    })

    for (let organisation of organisations) {
      const previousEmail = organisation.administrators[0].email
      const email = formatEmail(organisation.administrators[0].email)

      await Organisation.updateOne(
        { _id: organisation._id },
        {
          $set: {
            'administrators.0.email': email,
          },
        }
      )

      await createOrUpdateContact({
        email: previousEmail,
        otherAttributes: {
          email,
        },
      })
    }
  } catch (error) {
    console.error(error)
  }

  process.exit(1)
}

formatEmailContainingUppercase()
