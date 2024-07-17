import mongoose from 'mongoose'
import { config } from '../../../src/config'
import {
  Organisation,
  OrganisationType,
} from '../../../src/schemas/OrganisationSchema'
import { PollType } from '../../../src/schemas/PollSchema'
import { SimulationType } from '../../../src/schemas/SimulationSchema'

type AggregationResult = {
  _id: string // Email
  organisations: OrganisationType[]
  count: number
  polls: PollType[]
}

async function removeDuplicateOrganisations() {
  try {
    mongoose.connect(config.mongo.url)

    const pipeline = [
      {
        $unwind: {
          path: '$administrators',
          includeArrayIndex: 'string',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: '$administrators.email',
          organisations: {
            $addToSet: '$_id',
          },
          count: {
            $sum: 1,
          },
        },
      },
      {
        $lookup: {
          from: 'organisations',
          localField: 'organisations',
          foreignField: '_id',
          as: 'organisations',
        },
      },
      {
        $lookup: {
          from: 'polls',
          localField: 'organisations.polls',
          foreignField: '_id',
          as: 'polls',
        },
      },
      {
        $match: {
          count: {
            $gt: 1,
          },
        },
      },
    ]

    const aggregationResult = (await Organisation.aggregate(
      pipeline
    )) as unknown as AggregationResult[]

    for (let administratorObject of aggregationResult) {
      // Skip the non problematic cases
      if (administratorObject.count <= 1) {
        continue
      }

      const organisationsWithMatchingPolls =
        administratorObject.organisations.reduce(
          (acc: OrganisationType[], organisation: OrganisationType) => {
            return [
              ...acc,
              {
                ...organisation,
                polls: administratorObject.polls.filter((poll) =>
                  (organisation.polls as unknown as string[]).includes(poll._id)
                ) as PollType[],
              },
            ] as OrganisationType[]
          },
          [] as OrganisationType[]
        ) as unknown as (OrganisationType & {
          polls: (PollType & { simulations: SimulationType[] })[]
        })[]

      // For each organisation :
      // - check if the polls have simulations
      // - check if a name is set for the poll
      // if not remove the organisation
      for (let organisation of organisationsWithMatchingPolls) {
        const hasSimulation = organisation.polls.some(
          (poll: PollType & { simulations: SimulationType[] }) =>
            poll?.simulations && poll?.simulations?.length > 0
        )
        const hasName = organisation.polls.some(
          (poll: PollType) => poll?.name && poll?.name !== undefined
        )

        if (!hasSimulation || !hasName) {
          console.log(
            `Removing organisation ${organisation._id} with simulation ${hasSimulation} and name ${hasName}`
          )
          await Organisation.findByIdAndDelete(organisation._id)
        }
      }
    }
  } catch (error) {
    console.error(error)
  }
}

removeDuplicateOrganisations()
