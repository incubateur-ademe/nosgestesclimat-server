const { UserModel } = require('../../schemas/UserSchema')

async function getUserDocument({ email, name }) {
  let userDocument

  try {
    // Check if user already exists
    userDocument = await UserModel.findOne({
      email,
    })
  } catch (error) {
    // Do nothing
  }

  // If not, create it
  if (!userDocument) {
    const newUser = new UserModel({
      name,
      email,
    })

    userDocument = await newUser.save()
  }
}

module.exports = getUserDocument
