import type { Request, Response } from 'express'
import express from 'express'
import { prisma } from '../../adapters/prisma/client'
import { findUniquePollSlug } from '../../helpers/organisations/findUniquePollSlug'
import logger from '../../logger'
import { authentificationMiddleware } from '../../middlewares/authentificationMiddleware'
import { Organisation } from '../../schemas/OrganisationSchema'
import { Poll } from '../../schemas/PollSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'

const router = express.Router()

router
  .use(authentificationMiddleware)
  .route('/')
  .post(async (req: Request, res: Response) => {
    try {
      const organisationId = req.body.organisationId
      const defaultAdditionalQuestions = req.body.defaultAdditionalQuestions
      const customAdditionalQuestions = req.body.customAdditionalQuestions
      const name = req.body.name

      if (!organisationId || !name) {
        return res.status(403).json('Error. Missing required info.')
      }
      const organisation = await Organisation.findById(organisationId)

      if (!organisation) {
        return res.status(403).json('Error. Organisation not found.')
      }

      const uniqueSlug = await findUniquePollSlug(name)

      const pollCreated = new Poll({
        name,
        slug: uniqueSlug,
        simulations: [],
        defaultAdditionalQuestions,
        customAdditionalQuestions,
      })

      const newlySavedPoll = await pollCreated.save()

      try {
        await prisma.poll.create({
          data: {
            id: newlySavedPoll._id.toString(),
            name,
            slug: uniqueSlug,
            organisationId,
            customAdditionalQuestions: customAdditionalQuestions || [],
            ...(defaultAdditionalQuestions?.length
              ? {
                  defaultAdditionalQuestions: {
                    createMany: defaultAdditionalQuestions.map(
                      (type: string) => ({
                        type,
                      })
                    ),
                  },
                }
              : {}),
          },
        })
      } catch (error) {
        logger.error('postgre Polls replication failed', error)
      }

      organisation.polls.push(newlySavedPoll._id)

      await organisation.save()

      setSuccessfulJSONResponse(res)

      res.json(newlySavedPoll)

      console.log('New poll created')
    } catch (error) {
      console.warn(error)
      return res.status(403).json(error)
    }
  })

export default router
