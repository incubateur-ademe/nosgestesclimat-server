import axios from 'axios'
import express from 'express'
import { addOrUpdateContact, fetchContact } from '../../adapters/brevo/client'
import { Attributes } from '../../adapters/brevo/constant'
import { axiosConf } from '../../constants/axios'
import { createOrUpdateUser } from './createOrUpdateUser'

const router = express.Router()

/**
 * Updates the user and newsletter settings
 */
router.route('/').post(async (req, res) => {
  const email =
    typeof req.body.email === 'string'
      ? req.body.email.toLowerCase().trim()
      : ''
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
        ;({ listIds: currentListIds } = await fetchContact(email))
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

      // Update Brevo contact
      if (name || listsAdded.length > 0) {
        await addOrUpdateContact({
          email,
          listIds: listsAdded,
          attributes: {
            [Attributes.PRENOM]: name,
          },
        })
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

    return res.status(200).send('Settings successfully updated.')
  } catch (error) {
    return res.status(500).send('Error updating settings: ' + error)
  }
})

/**
 * @deprecated should use features/users instead
 */
export default router
