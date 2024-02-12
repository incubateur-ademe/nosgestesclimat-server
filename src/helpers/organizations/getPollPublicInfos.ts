import { Organization } from '../../schemas/OrganizationSchema'
import { PollPublicInfo } from '../../types/types'
import { findPollBySlug } from './findPollBySlug'

type Props = {
  pollSlug: string
}
export async function getPollPublicInfos({
  pollSlug,
}: Props): Promise<PollPublicInfo | null> {
  const poll = await findPollBySlug(pollSlug)

  if (!poll) {
    return null
  }

  const organisation = await Organization.findOne({
    polls: poll._id,
  })

  if (!organisation) {
    return null
  }

  const pollPublicInfos: PollPublicInfo = {
    name: poll.slug,
    slug: poll.slug,
    defaultAdditionalQuestions: poll.defaultAdditionalQuestions,
    expectedNumberOfParticipants: poll.expectedNumberOfParticipants,
    numberOfParticipants: poll.simulations.length,
    organisationInfo: {
      name: organisation.name,
      slug: organisation.slug,
    },
  }

  return pollPublicInfos
}
