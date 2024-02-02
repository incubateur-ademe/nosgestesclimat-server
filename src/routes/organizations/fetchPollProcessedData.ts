import express, { Request, Response } from 'express'

import { Organization } from '../../schemas/OrganizationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { authentificationMiddleware } from '../../middlewares/authentificationMiddleware'
import { processPollData } from '../../helpers/organizations/processPollData'
import { Simulation } from '../../schemas/SimulationSchema'

const router = express.Router()

router
  .use(authentificationMiddleware)
  .post('/', async (req: Request, res: Response) => {
    const email = req.body.email
    const fileName = req.body.fileName

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
      }).populate('polls.simulations')

      if (!organizationFound) {
        return res.status(403).json('No organization found.')
      }

      const pollData = processPollData({
        simulations: organizationFound?.polls[0]
          ?.simulations as unknown as Simulation[],
        rules,
      })

      setSuccessfulJSONResponse(res)

      res.json(pollData)
    } catch (error) {
      res.status(403).json('No organization found.')
    }
  })

export default router
