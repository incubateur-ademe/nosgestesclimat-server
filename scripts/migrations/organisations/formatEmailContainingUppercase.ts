import { Organisation } from '../../../src/schemas/OrganisationSchema'
import mongoose from 'mongoose'
import { config } from '../../../src/config'

async function formatEmailContainingUppercase() {
  try {
    mongoose.connect(config.mongo.url)

    const organisations = await Organisation.find({
      email: { $regex: /[A-Z]/ },
    })

    for (const organisation of organisations) {
      const email = organisation.administrators[0].email.toLowerCase().trim()

      await Organisation.updateOne(
        { _id: organisation._id },
        { $set: { email } }
      )
    }
  } catch (error) {
    console.error(error)
  }
}

formatEmailContainingUppercase()
