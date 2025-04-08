import express from 'express'
import { fetchContactOrThrow } from '../../adapters/brevo/client'

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

  try {
    const { listIds } = await fetchContactOrThrow(email)
    return res.status(200).json(listIds)
  } catch (error) {
    console.warn(error)
    return res.status(200).json([])
  }
})

/**
 * @deprecated should use features/newsletters instead
 */
export default router
