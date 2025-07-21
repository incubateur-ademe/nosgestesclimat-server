import express from 'express'
import { fetchContact } from '../../adapters/brevo/client.js'

const router = express.Router()

/**
 * Updates the user and newsletter settings
 */
router.route('/').get(async (req, res) => {
  const email =
    typeof req.query.email === 'string'
      ? req.query.email.toLowerCase().trim()
      : ''

  // Check if all required fields are provided
  if (!email) {
    return res.status(500).send('Error. An email must be provided.')
  }

  const contact = await fetchContact(email)

  return res.status(200).json(contact?.listIds || [])
})

/**
 * @deprecated should use features/newsletters instead
 */
export default router
