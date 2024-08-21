import type { PollType } from '../../schemas/PollSchema'
import { Poll } from '../../schemas/PollSchema'

export async function findPollsBySlug(slugs: string[]): Promise<PollType[]> {
  if (!slugs) {
    return Promise.resolve([])
  }

  return await Poll.find({
    slug: { $in: slugs },
  })
}
