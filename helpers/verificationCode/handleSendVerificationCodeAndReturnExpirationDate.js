const dayjs = require('dayjs')
const sendVerificationCode = require('../email/sendVerificationCode')
const generateRandomNumberWithLength = require('../../utils/generateRandomNumberWithLength')
const Organization = require('../../schemas/OrganizationSchema')

async function handleSendVerificationCodeAndReturnExpirationDate({
  ownerEmail,
  next,
}) {
  const organizationFound = await Organization.findOne({
    'owner.email': ownerEmail,
  })

  if (!ownerEmail) {
    return next('No email provided.')
  }

  if (!organizationFound) {
    return next('No matching organization found.')
  }

  // Generate a random code
  const verificationCode = generateRandomNumberWithLength(6)

  const expirationDate = dayjs().add(1, 'hour').toDate()

  organizationFound.verificationCode = {
    code: verificationCode,
    expirationDate,
  }

  await organizationFound.save()

  // Send the code by email
  await sendVerificationCode({
    email: ownerEmail,
    verificationCode,
  })

  return expirationDate
}

module.exports = handleSendVerificationCodeAndReturnExpirationDate
