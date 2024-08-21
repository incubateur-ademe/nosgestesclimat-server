import type { PollType } from '../../schemas/PollSchema'
import { Poll } from '../../schemas/PollSchema'
import type { SimulationType } from '../../schemas/SimulationSchema'
import type { UserType } from '../../schemas/UserSchema'

type PopulatedPoll = Omit<PollType, 'simulations'> & {
  simulations: Array<
    Omit<SimulationType, 'user'> & {
      user: UserType
    }
  >
}

export function findPopulatedPollBySlug(slug: string) {
  if (!slug) {
    return null
  }
  return Poll.findOne({ slug }).populate<PopulatedPoll>({
    path: 'simulations',
    populate: {
      path: 'user',
    },
  })
}
