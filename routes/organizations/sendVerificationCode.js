const express = require('express')
const findOrganizationAndSendVerificationCode = require('../../helpers/findOrganizationAndSendVerificationCode')
const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')

const router = express.Router()

router.post('/send-verification-code', async (req, res, next) => {
  const expirationDate = await findOrganizationAndSendVerificationCode(
    req,
    next
  )

  setSuccessfulJSONResponse(res)

  res.json({
    expirationDate,
  })

  console.log('Verification code sent.')
})

module.exports = router
