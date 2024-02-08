import express, { Request, Response } from 'express'

import { Organization } from '../../schemas/OrganizationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { processPollData } from '../../helpers/organizations/processPollData'
import { Simulation } from '../../schemas/SimulationSchema'
import { authenticatePollMiddleware } from '../../middlewares/authenticatePollMiddleware'

const router = express.Router()

router
  .use(authenticatePollMiddleware)
  .post('/', async (req: Request, res: Response) => {
    const email = req.body.email
    const fileName = req.body.fileName
    const userId = req.body.userId

    if (!email) {
      return res.status(403).json('No owner email provided.')
    }

    if (!fileName) {
      return res.status(403).json('No fileName provided.')
    }

    // The model version to fetch must be defined by the front-end
    const rules = await import(
      `@incubateur-ademe/nosgestesclimat/public/${fileName}`
    ).then((module) => module.default)

    try {
      const organizationFound = await Organization.findOne({
        'administrators.email': email,
      })
        .populate('polls.simulations')
        .populate('polls.simulations.user')

      if (!organizationFound) {
        return res.status(403).json('No organization found.')
      }

      const pollData = processPollData({
        simulations: organizationFound?.polls[0]
          ?.simulations as unknown as Simulation[],
        rules,
        userId,
      })

      setSuccessfulJSONResponse(res)

      res.json(pollData)
    } catch (error) {
      res.status(403).json('No organization found.')
    }
  })

export default router
