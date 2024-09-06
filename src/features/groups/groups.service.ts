import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException'
import { isPrismaErrorNotFound } from '../../core/typeguards/isPrismaErrorNotFound'
import { createGroupAndUser, updateUserGroup } from './groups.repository'
import type {
  GroupCreateDto,
  GroupUpdateDto,
  UserGroupParams,
} from './groups.validator'

/**
 * Maps a database group to a dto for the UI
 */
const groupToDto = (group: Awaited<ReturnType<typeof createGroupAndUser>>) => ({
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
})

export const createGroup = async (groupDto: GroupCreateDto) => {
  const group = await createGroupAndUser(groupDto)

  return groupToDto(group)
}

export const updateGroup = async (
  params: UserGroupParams,
  update: GroupUpdateDto
) => {
  try {
    const group = await updateUserGroup(params, update)

    return groupToDto(group)
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException()
    }
    throw e
  }
}
