import axios from 'axios'
import express from 'express'
import { axiosConf } from '../../constants/axios'
import { getContactLists } from '../../helpers/brevo/getContactLists'
import { createOrUpdateContact } from '../../helpers/email/createOrUpdateContact'
import { createOrUpdateUser } from '../../helpers/queries/createOrUpdateUser'
import { formatEmail } from '../../utils/formatting/formatEmail'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'

const router = express.Router()

/**
 * Updates the user and newsletter settings
 */
router.route('/').post(async (req, res) => {
  const email = formatEmail(req.body.email)
  const userId = req.body.userId

  const newsletterIds: Record<string, boolean> = req.body.newsletterIds
  const name: string = req.body.name

  // Check if all required fields are provided
  if (!email && !userId) {
    return res.status(500).send('Error. An email or a userId must be provided.')
  }

  try {
    if (newsletterIds) {
      let currentListIds: number[]

      try {
        currentListIds = await getContactLists(email)
      } catch (e) {
        console.warn(e)
        // The contact does not exist in Brevo
        currentListIds = []
      }

      const listsAdded: number[] = []
      const listsRemoved: number[] = []

      Object.entries(newsletterIds).forEach(([key, shouldBeInList]) => {
        const keyAsNumber = parseInt(key)

        // List id should be added
        if (shouldBeInList && !currentListIds?.includes(keyAsNumber)) {
          listsAdded.push(keyAsNumber)
        }

        // List id should be removed
        if (!shouldBeInList && currentListIds?.includes(keyAsNumber)) {
          listsRemoved.push(keyAsNumber)
        }
      })

      const updates: Record<string, string | number[]> = {}

      if (name) updates.name = name

      if (listsAdded.length > 0) updates.listIds = listsAdded

      // Update Brevo contact
      if (name || listsAdded.length > 0) {
        await createOrUpdateContact({ email, ...updates })
      }

      // Update DB User document
      if (name) {
        await createOrUpdateUser({ userId, email, name })
      }

      // We need to use a specific endpoint to remove contacts from lists
      if (listsRemoved.length > 0) {
        for (const listId of listsRemoved) {
          await axios.post(
            `/v3/contacts/lists/${listId}/contacts/remove`,
            {
              emails: [email],
            },
            axiosConf
          )
        }
      }
    }

    setSuccessfulJSONResponse(res)

    return res.send('Settings successfully updated.')
  } catch (error) {
    return res.status(500).send('Error updating settings: ' + error)
  }
})

export default router
