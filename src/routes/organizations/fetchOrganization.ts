import express, { Request, Response } from 'express'

import { Organization } from '../../schemas/OrganizationSchema'
import { authenticateToken } from '../../helpers/authentification/authentifyToken'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'

const router = express.Router()

/**
 * Fetching / updating by the owner
 * Needs to be authenticated and generates a new token at each request
 */
router.post('/', async (req: Request, res: Response) => {
  const administratorEmail = req.body.administratorEmail

  if (!administratorEmail) {
    return res.status(403).json('No owner email provided.')
  }

  // Authenticate the JWT
  try {
    authenticateToken({
      req,
      res,
      email: administratorEmail,
    })
  } catch (error) {
    res.status(403).json('Invalid token.')
    return
  }

  try {
    const organizationFound = await Organization.findOne({
      'administrators.email': administratorEmail,
    })

    setSuccessfulJSONResponse(res)

    res.json(organizationFound)
  } catch (error) {
    res.status(403).json('No organization found.')
  }
})

export default router
