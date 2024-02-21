import express, { Request, Response } from 'express'

import { Organisation } from '../../schemas/OrganisationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { processPollData } from '../../helpers/organisations/processPollData'
import { SimulationType } from '../../schemas/SimulationSchema'

const router = express.Router()

router.post('/', async (req: Request, res: Response) => {
  const orgaSlug = req.body.orgaSlug
  const userId = req.body.userId

  if (!orgaSlug) {
    return res.status(403).json('No orgaSlug provided.')
  }

  try {
    const organisationFound = await Organisation.findOne({
      slug: {
        $eq: orgaSlug,
      },
    }).populate({
      path: 'polls',
      populate: {
        path: 'simulations',
        populate: {
          path: 'user',
        },
      },
    })

    if (!organisationFound) {
      return res.status(403).json('No organisation found.')
    }

    // TODO : fix this
    /*
      if (
        !organisationFound.polls[0].simulations.some(
          // @ts-ignore
          (simulation) => simulation?.user?._id.toString() === userId
        )
      ) {
        return res.status(403).json("User id doesn't match any simulation.")
      }
      */

    const pollData = processPollData({
      simulations: organisationFound?.polls[0]
        ?.simulations as unknown as SimulationType[],
      userId: userId ?? '',
    })

    setSuccessfulJSONResponse(res)

    res.json({ ...pollData, organisationName: organisationFound?.name } )
  } catch (error) {
    console.log(error)
    res.status(500).json('Server error.')
  }
})

export default router
