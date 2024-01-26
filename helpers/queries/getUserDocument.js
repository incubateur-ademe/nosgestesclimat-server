const { UserModel } = require('../../schemas/UserSchema')

async function getUserDocument({ email, userId, name }) {
  let userDocument

  try {
    // Check if user already exists
    userDocument = await UserModel.findOne({ $or: [{ email }, { userId }] })
  } catch (error) {
    // Do nothing
  }

  // If not, create it
  if (!userDocument) {
    const newUser = new UserModel({
      name,
      email,
      userId,
    })

    userDocument = await newUser.save()

    return userDocument
  }
}

module.exports = getUserDocument
