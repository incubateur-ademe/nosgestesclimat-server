import type { PipelineStage } from 'mongoose'
import mongoose from 'mongoose'
import { config } from '../../../src/config'
import type { OrganisationType } from '../../../src/schemas/OrganisationSchema'
import type { PollType } from '../../../src/schemas/PollSchema'
import { Organisation } from './../../../src/schemas/OrganisationSchema'

type OrganisationWithPollsPopulatedType = Omit<OrganisationType, 'polls'> & {
  polls: PollType[]
}

type AdministratorObject = {
  email: string // Email
  organisations: OrganisationWithPollsPopulatedType[]
  count: number
  allAdministratorPolls: PollType[]
}

async function removeDuplicateOrganisations() {
  try {
    mongoose.connect(config.mongo.url)

    const pipeline: PipelineStage[] = [
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
          as: 'allAdministratorPolls',
        },
      },
      {
        $project: {
          email: '$_id',
          organisations: 1,
          count: 1,
          allAdministratorPolls: 1,
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

    const administratorObjects = Organisation.aggregate(
      pipeline
    ).cursor<AdministratorObject>({ batchSize: 1000 })

    for await (const administratorObject of administratorObjects) {
      // Skip the non problematic cases
      if (administratorObject.count <= 1) {
        continue
      }

      const organisationsWithMatchingPolls =
        administratorObject.organisations.reduce(
          (acc: OrganisationWithPollsPopulatedType[], organisation) => {
            return [
              ...acc,
              {
                ...organisation,
                polls: administratorObject.allAdministratorPolls.filter(
                  (poll) =>
                    organisation.polls.findIndex((pollId) => {
                      return (
                        poll._id &&
                        pollId &&
                        pollId.toString() === poll._id.toString()
                      )
                    }) > -1
                ),
              },
            ]
          },
          []
        )
      console.log('--')
      console.log('--')
      console.log(
        ' has ',
        organisationsWithMatchingPolls.length,
        ' organisations'
      )

      let hasKeptOrganisation = false

      for (const [
        index,
        organisationWithMatchingPoll,
      ] of organisationsWithMatchingPolls.entries()) {
        // We want to leave minimum one organisation for each administrator
        // even if it has no polls
        const isLastValidOrganisation =
          !hasKeptOrganisation &&
          index === organisationsWithMatchingPolls.length - 1

        const hasSimulation = organisationWithMatchingPoll.polls.some(
          (poll) => poll?.simulations && poll?.simulations?.length > 0
        )

        const hasName = organisationWithMatchingPoll.polls.some(
          (poll) => poll?.name && poll?.name !== undefined
        )

        // List the organisations that need manual intervention
        if (hasSimulation || hasName || isLastValidOrganisation) {
          console.log(
            `Keeping organisation ${organisationWithMatchingPoll._id} for administrator ${organisationWithMatchingPoll.administrators[0].email}`
          )
          hasKeptOrganisation = true
          continue
        }

        if (!hasSimulation || !hasName) {
          console.log(
            `Removing organisation ${organisationWithMatchingPoll._id} with simulation ${hasSimulation} and name ${hasName}`
          )
          console.log('--')
          await Organisation.findByIdAndDelete(organisationWithMatchingPoll._id)
        }
      }
    }
  } catch (error) {
    console.error(error)
  }

  process.exit(0)
}

removeDuplicateOrganisations()
