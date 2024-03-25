import { Poll } from '../../schemas/PollSchema'

export function findPopulatedPollBySlug(slug: string) {
  if (!slug) {
    return null
  }
  return Poll.findOne({ slug }).populate({
    path: 'simulations',
    populate: {
      path: 'user',
    },
  })
}
