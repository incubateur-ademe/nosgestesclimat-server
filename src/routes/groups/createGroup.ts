import express from 'express'
import { Group } from '../../schemas/GroupSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'

const router = express.Router()

/**
 * Create a new group
 * It requires a userId, an administratorName, an administratorEmail, a name and an emoji
 * It returns the created group
*/
router.route('/').post(async (req, res) => {
  const userId = req.body.userId
  const groupName = req.body.name
  const groupEmoji = req.body.emoji
  const administratorName = req.body.administratorName
  const administratorEmail = req.body.administratorEmail

  if (!userId) {
    return res.status(500).send('Error. A userId must be provided.')
  }
  if (!groupName) {
    return res.status(500).send('Error. A group name must be provided.')
  }
  if (!groupEmoji) {
    return res.status(500).send('Error. A group emoji must be provided.')
  }

  if (!administratorEmail) {
    return res.status(500).send('Error. An email must be provided.')
  }
  if (!administratorName) {
    return res.status(500).send('Error. A name must be provided.')
  }

  try {
    const newGroup = new Group({
      name: groupName,
      emoji: groupEmoji,
      administrator: {
        name: administratorName,
        email: administratorEmail,
        userId,
      },
      participants: [],
    })

    const groupDocument = await newGroup.save()

    // Send response
    setSuccessfulJSONResponse(res)

    res.json(groupDocument)

    console.log(`Group created: ${groupDocument._id} (${groupName})`)
  } catch (error) {
    return res.status(500).send('Error while creating group.')
  }
})

export default router
