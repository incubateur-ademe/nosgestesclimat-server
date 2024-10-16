import express from 'express'
import { sendEmail } from '../../helpers/email/sendEmail'
import { formatEmail } from '../../utils/formatting/formatEmail'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'

const router = express.Router()

/**
 * Send a email using the Brevo API
 * It requires a email, a templateId, params and attributes
 * It returns the created group
 */
router.route('/').post(async (req, res) => {
  const email = formatEmail(req.body.email)
  const templateId = req.body.templateId
  const params = req.body.params
  const attributes = req.body.attributes

  // Check if all required fields are provided
  if (!email) {
    return res.status(500).send('Error. An email address must be provided.')
  }

  if (!templateId) {
    return res.status(500).send('Error. A templateId must be provided.')
  }

  try {
    await sendEmail({ email, templateId, params, attributes })

    setSuccessfulJSONResponse(res)

    return res.send('Email sent successfully')
  } catch (error) {
    return res.status(500).send('Error sending email: ' + error)
  }
})

export default router