import migrationInstructionsJSON from '@incubateur-ademe/nosgestesclimat/public/migration.json'
// @ts-expect-error Typing error in the library
import { migrateSituation } from '@publicodes/tools/migration'
import express from 'express'
import { computeResults } from '../../helpers/simulation/computeResults'
import type { GroupType, ParticipantType } from '../../schemas/GroupSchema'
import { Group } from '../../schemas/GroupSchema'
import { Simulation, type SimulationType } from '../../schemas/SimulationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'

const router = express.Router()

type PopulatedParticipantType = Omit<ParticipantType, 'simulation'> & {
  simulation: SimulationType
}

type PopulatedGroupType = Omit<GroupType, 'participants'> & {
  participants: PopulatedParticipantType[]
}

/**
 * Fetch a group
 * It requires a groupId
 */
router.route('/').post(async (req, res) => {
  const groupId = req.body.groupId

  if (!groupId) {
    return res.status(500).send('Error. A groupId must be provided.')
  }

  try {
    const group = await Group.findById(groupId)
      .populate<PopulatedGroupType>({
        path: 'participants',
        populate: {
          path: 'simulation',
          match: { progression: 1 },
        },
      })
      .lean()

    // If no group is found, we return an error
    if (!group) {
      return res.status(404).send('Error. Group not found.')
    }

    for (const participant of group.participants) {
      const { simulation } = participant

      if (
        !simulation ||
        (!!simulation.computedResults && !!simulation.computedResults.carbone)
      ) {
        continue
      }

      const situationMigrated = migrateSituation(
        simulation.situation,
        migrationInstructionsJSON
      )

      const computedResults = computeResults(situationMigrated)

      participant.simulation = (await Simulation.findByIdAndUpdate(
        simulation._id,
        {
          computedResults: {
            carbone: computedResults,
          },
        },
        { new: true }
      ).lean())!
    }

    setSuccessfulJSONResponse(res)

    res.json(group)

    console.log(`Group fetched: ${groupId}`)
  } catch (error) {
    console.warn(error)
    res.status(500).send('Error. Group not found.')
  }
})

export default router
