import { HydratedDocument } from 'mongoose'
import express, { Request, Response } from 'express'

import { Organisation } from '../../schemas/OrganisationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { processPollData } from '../../helpers/organisations/processPollData'
import { SimulationType } from '../../schemas/SimulationSchema'
import rules from '@incubateur-ademe/nosgestesclimat/public/co2-model.FR-lang.fr.json'
import { handleComputeResultsIfNone } from '../../helpers/simulation/handleComputeResultsIfNone'
import Engine from 'publicodes'
import { NGCRules } from '@incubateur-ademe/nosgestesclimat'

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
        match: { progression: 1 },
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

    let engine = undefined

    if (organisationFound?.polls[0]?.simulations.length < 100) {
      engine = new Engine(rules as unknown as NGCRules, {
        logger: {
          log: console.log,
          warn: () => null,
          error: console.error,
        },
      })
    }

    const pollData = processPollData({
      // TODO : remove unformatting when possible
      simulations: (
        organisationFound?.polls[0]?.simulations as unknown as SimulationType[]
      ).map((simulation) =>
        handleComputeResultsIfNone(
          simulation as HydratedDocument<SimulationType>,
          engine
        )
      ),
      userId: userId ?? '',
    })

    setSuccessfulJSONResponse(res)

    res.json({
      ...pollData,
      organisationName: organisationFound?.name,
      defaultAdditionalQuestions:
        organisationFound?.polls[0]?.defaultAdditionalQuestions,
      customAdditionalQuestions:
        organisationFound?.polls[0]?.customAdditionalQuestions,
      isAdmin: organisationFound?.administrators.some(
        (admin) => admin?.userId === userId
      ),
    })
  } catch (error) {
    console.log(error)
    res.status(500).json('Server error.')
  }
})

export default router
