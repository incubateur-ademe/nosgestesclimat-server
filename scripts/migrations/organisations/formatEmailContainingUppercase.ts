import { Organisation } from '../../../src/schemas/OrganisationSchema'
import mongoose from 'mongoose'
import { config } from '../../../src/config'

async function formatEmailContainingUppercase() {
  try {
    mongoose.connect(config.mongo.url)

    const organisations = await Organisation.find({
      'administrators.email': { $regex: /[A-Z]/ },
    })

    for (let organisation of organisations) {
      const email = organisation.administrators[0].email.toLowerCase().trim()
      console.log(organisation.administrators[0].email, email)
      await Organisation.updateOne(
        { _id: organisation._id },
        {
          $set: {
            'administrators.0.email': email,
          },
        }
      )
    }
  } catch (error) {
    console.error(error)
  }

  process.exit(1)
}

formatEmailContainingUppercase()
