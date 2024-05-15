import { Organisation } from '../../schemas/OrganisationSchema'
import { PollPublicInfo } from '../../types/types'
import { findPollsBySlug } from './findPollsBySlug'

type Props = {
  pollSlug: string
}
export async function getPollPublicInfos({
  pollSlug,
}: Props): Promise<PollPublicInfo | null> {
  const polls = await findPollsBySlug([pollSlug])

  const poll = polls[0]

  if (!poll) {
    return null
  }

  const organisation = await Organisation.findOne({
    polls: poll._id,
  })

  if (!organisation) {
    return null
  }

  const pollPublicInfos: PollPublicInfo = {
    name: poll.slug,
    slug: poll.slug,
    defaultAdditionalQuestions: poll.defaultAdditionalQuestions,
    customAdditionalQuestions: poll.customAdditionalQuestions?.filter(
      (question) => question.isEnabled
    ),
    expectedNumberOfParticipants: poll.expectedNumberOfParticipants,
    numberOfParticipants: poll.simulations.length,
    organisationInfo: {
      name: organisation.name,
      slug: organisation.slug,
    },
  }

  return pollPublicInfos
}
