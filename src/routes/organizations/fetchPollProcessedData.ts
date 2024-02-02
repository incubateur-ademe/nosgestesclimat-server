import express, { Request, Response } from 'express'

import { Organization } from '../../schemas/OrganizationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { authentificationMiddleware } from '../../middlewares/authentificationMiddleware'

const router = express.Router()

router
  .use(authentificationMiddleware)
  .post('/', async (req: Request, res: Response) => {
    const email = req.body.email

    if (!email) {
      return res.status(403).json('No owner email provided.')
    }

    try {
      const organizationFound = await Organization.findOne({
        'administrators.email': email,
      }).populate('polls.simulations')

      setSuccessfulJSONResponse(res)

      res.json(organizationFound)
    } catch (error) {
      res.status(403).json('No organization found.')
    }
  })

export default router
