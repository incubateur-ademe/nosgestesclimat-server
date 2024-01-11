async function findOrganizationAndSendVerificationCode(req, res, next) {
  const ownerEmail = req.body.ownerEmail

  const organizationFound = await Organization.findOne({
    'owner.email': ownerEmail,
  })

  if (!ownerEmail) {
    return next('No email provided.')
  }

  if (!organizationFound) {
    return next('No matching organization found.')
  }

  return await handleSendVerificationCodeAndReturnExpirationDate({
    ownerEmail,
    organization: organizationFound,
  })
}

module.exports = findOrganizationAndSendVerificationCode
