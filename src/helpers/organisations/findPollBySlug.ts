import { Poll } from '../../schemas/PollSchema'

export function findPollBySlug(slug: string) {
  if (!slug) {
    return null
  }
  return Poll.findOne({ slug })
}
