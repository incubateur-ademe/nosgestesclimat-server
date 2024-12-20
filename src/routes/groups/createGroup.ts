import express from 'express'
import { prisma } from '../../adapters/prisma/client'
import { isValidEmail } from '../../core/typeguards/isValidEmail'
import { sendGroupEmail } from '../../helpers/email/sendGroupEmail'
import logger from '../../logger'
import { Group } from '../../schemas/GroupSchema'
import { formatEmail } from '../../utils/formatting/formatEmail'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { validateEmail } from '../../utils/validation/validateEmail'

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
  const administratorEmail = formatEmail(req.body.administratorEmail)

  // We need the origin to send the email with the correct links
  const origin = req.get('origin') ?? 'https://nosgestesclimat.fr'

  // Check if all required fields are provided
  if (!userId) {
    return res.status(500).send('Error. A userId must be provided.')
  }
  if (!groupName) {
    return res.status(500).send('Error. A group name must be provided.')
  }
  if (!groupEmoji) {
    return res.status(500).send('Error. A group emoji must be provided.')
  }

  if (!administratorName) {
    return res.status(500).send('Error. A name must be provided.')
  }

  if (administratorEmail && !validateEmail(administratorEmail)) {
    return res
      .status(500)
      .send('Error. A valid email address must be provided.')
  }

  try {
    // Create a new group with an empty participants array
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

    const group = await newGroup.save()

    try {
      await prisma.user.upsert({
        where: {
          id: userId,
        },
        create: {
          id: userId,
          name: administratorName,
          ...(administratorEmail && isValidEmail(administratorEmail)
            ? { email: administratorEmail }
            : {}),
        },
        update: {
          name: administratorName,
          ...(administratorEmail && isValidEmail(administratorEmail)
            ? { email: administratorEmail }
            : {}),
        },
      })

      await prisma.group.create({
        data: {
          id: group._id.toString(),
          name: groupName,
          emoji: groupEmoji,
          administrator: {
            create: {
              userId,
            },
          },
        },
      })
    } catch (error) {
      logger.error('postgre Groups replication failed', error)
    }

    // Get the numbers of created groups by the administrator
    const createdGroups = await Group.find({
      'administrator.userId': userId,
    })

    // Send creation confirmation email to the administrator (if an email is provided)
    sendGroupEmail({
      group,
      userId,
      name: administratorName,
      email: administratorEmail,
      isCreation: true,
      origin,
      numberCreatedGroups: createdGroups?.length,
    })

    // Send response
    setSuccessfulJSONResponse(res)

    res.json(group)

    console.log(`Group created: ${group._id} (${groupName})`)
  } catch (error) {
    console.warn(error)
    return res.status(500).send('Error while creating group.')
  }
})

/**
 * @deprecated should use features/groups instead
 */
export default router
