import mongoose from 'mongoose'
import { Organisation } from '../../../src/schemas/OrganisationSchema'
import { config } from '../../../src/config'
import { createOrUpdateContact } from '../../../src/helpers/email/createOrUpdateContact'
import { formatEmail } from '../../../src/utils/formatting/formatEmail'

// This script will format the email of an organisation's administrator if it contains an uppercase letter.
// to correct a bug caused by a lack of validation
async function formatEmailContainingUppercase() {
  try {
    mongoose.connect(config.mongo.url)

    const organisations = Organisation.find({
      'administrators.email': { $regex: /[A-Z]/ },
    }).cursor({ batchSize: 1000 })

    for await (const organisation of organisations) {
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

  process.exit(0)
}

formatEmailContainingUppercase()
