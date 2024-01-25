const dayjs = require('dayjs')
const sendVerificationCode = require('../email/sendVerificationCode')
const generateRandomNumberWithLength = require('../../utils/generateRandomNumberWithLength')
const {
  VerificationCodeModel,
} = require('../../schemas/VerificationCodeSchema')

async function handleSendVerificationCodeAndReturnExpirationDate(email) {
  // Generate a random code
  const verificationCode = generateRandomNumberWithLength(6)

  const expirationDate = dayjs().add(1, 'hour').toDate()

  const verificationCodeCreated = new VerificationCodeModel({
    code: verificationCode,
    expirationDate,
    email,
  })

  await verificationCodeCreated.save()

  // Send the code by email
  await sendVerificationCode({
    email,
    verificationCode,
  })

  return expirationDate
}

module.exports = handleSendVerificationCodeAndReturnExpirationDate
