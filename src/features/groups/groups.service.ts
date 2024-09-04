import { createGroupAndUser } from './groups.repository'
import type { GroupCreateDto } from './groups.validator'

export const createGroup = async (groupDto: GroupCreateDto) => {
  const group = await createGroupAndUser(groupDto)

  return {
    ...group,
    administrator: group.administrator?.user,
    participants: (group.participants || []).map(
      ({ id, simulationId, user: { id: userId, ...rest } }) => ({
        id,
        simulation: simulationId,
        userId,
        ...rest,
      })
    ),
  }
}
