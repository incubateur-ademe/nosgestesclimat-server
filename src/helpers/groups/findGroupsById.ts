import type { GroupType } from '../../schemas/GroupSchema'
import { Group } from '../../schemas/GroupSchema'

export async function findGroupsById(ids: string[]): Promise<GroupType[]> {
  if (!ids) {
    return Promise.resolve([])
  }

  return await Group.find({
    _id: { $in: ids },
  })
}
