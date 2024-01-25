const Organization = require('../schemas/OrganizationSchema')
const handleSendVerificationCodeAndReturnExpirationDate = require('./verificationCode/handleSendVerificationCodeAndReturnExpirationDate')

async function findOrganizationAndSendVerificationCode(req, next) {
  const administratorEmail = req.body.administratorEmail

  const organizationFound = await Organization.findOne({
    'owner.email': administratorEmail,
  })

  if (!administratorEmail) {
    return next('No email provided.')
  }

  if (!organizationFound) {
    return next('No matching organization found.')
  }

  return await handleSendVerificationCodeAndReturnExpirationDate({
    administratorEmail,
    organization: organizationFound,
  })
}

module.exports = findOrganizationAndSendVerificationCode
