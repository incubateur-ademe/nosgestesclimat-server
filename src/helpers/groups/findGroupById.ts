import { Group } from '../../schemas/GroupSchema'

export function findGroupById(id: string) {
  if (!id) {
    return null
  }
  return Group.findOne({ _id:id })
}
