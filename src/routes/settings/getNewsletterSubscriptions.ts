import express from 'express'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { getContactLists } from '../../helpers/brevo/getContactLists'
import { formatEmail } from '../../utils/formatting/formatEmail'

const router = express.Router()

/**
 * Updates the user and newsletter settings
 */
router.route('/').get(async (req, res) => {
  const email = formatEmail(req.query.email as string)

  // Check if all required fields are provided
  if (!email) {
    return res.status(500).send('Error. An email must be provided.')
  }

  try {
    const listIds = await getContactLists(email)

    setSuccessfulJSONResponse(res)

    return res.json(listIds)
  } catch (error) {
    return res.status(500).send('Error updating settings: ' + error)
  }
})

export default router
