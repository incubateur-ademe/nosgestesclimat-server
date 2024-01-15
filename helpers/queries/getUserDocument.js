const { UserModel } = require('../../schemas/UserSchema')

async function getUserDocument({ ownerEmail, ownerName, userId }) {
  let userDocument

  try {
    // Check if user already exists
    userDocument = await UserModel.findOne({
      $or: [{ userId }, { email: ownerEmail }],
    })
  } catch (error) {
    // Do nothing
  }

  // If not, create it
  if (!userDocument) {
    const newUser = new UserModel({
      name: ownerName,
      email: ownerEmail,
      userId,
    })

    userDocument = await newUser.save()
  }
}

module.exports = getUserDocument
