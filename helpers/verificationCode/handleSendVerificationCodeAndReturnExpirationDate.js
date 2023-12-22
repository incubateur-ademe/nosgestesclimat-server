const dayjs = require('dayjs')
const sendVerificationCode = require('../email/sendVerificationCode')
const generateRandomNumberWithLength = require('../../utils/generateRandomNumberWithLength')

async function handleSendVerificationCodeAndReturnExpirationDate({
  organization,
  ownerEmail,
}) {
  // Generate a random code
  const verificationCode = generateRandomNumberWithLength(6)

  const expirationDate = dayjs().add(1, 'hour').toDate()

  organization.verificationCode = {
    code: verificationCode,
    expirationDate,
  }

  await organization.save()

  // Send the code by email
  await sendVerificationCode({
    email: ownerEmail,
    verificationCode,
  })

  return expirationDate
}

module.exports = handleSendVerificationCodeAndReturnExpirationDate
