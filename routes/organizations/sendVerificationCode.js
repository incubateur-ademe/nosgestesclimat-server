const express = require('express')
const findOrganizationAndSendVerificationCode = require('../../helpers/findOrganizationAndSendVerificationCode')
const {
  setSuccessfulJSONResponse,
} = require('../../utils/setSuccessfulResponse')

const router = express.Router()

router.post('/', async (req, res, next) => {
  try {
    const expirationDate = await findOrganizationAndSendVerificationCode(
      req,
      next
    )

    setSuccessfulJSONResponse(res)

    res.json({
      expirationDate,
    })

    console.log('Verification code sent.')
  } catch (error) {
    return res.status(403).json("Une erreur s'est produite.")
  }
})

module.exports = router
