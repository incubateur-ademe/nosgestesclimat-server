import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException'
import {
  isPrismaErrorForeignKeyConstraintFailed,
  isPrismaErrorNotFound,
} from '../../core/typeguards/isPrismaError'
import {
  createGroupAndUser,
  createParticipantAndUser,
  updateUserGroup,
} from './groups.repository'
import type {
  GroupCreateDto,
  GroupParams,
  GroupUpdateDto,
  ParticipantCreateDto,
  UserGroupParams,
} from './groups.validator'

/**
 * Maps a database group to a dto for the UI
 */
const groupToDto = (group: Awaited<ReturnType<typeof createGroupAndUser>>) => ({
  ...group,
  administrator: group.administrator?.user,
  participants: (group.participants || []).map(participantToDto),
})

/**
 * Maps a database participant to a dto for the UI
 */
const participantToDto = ({
  id,
  simulationId,
  user: { id: userId, ...rest },
}: Awaited<ReturnType<typeof createParticipantAndUser>>) => ({
  id,
  simulation: simulationId,
  userId,
  ...rest,
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
      throw new EntityNotFoundException('Group not found')
    }
    throw e
  }
}

export const createParticipant = async (
  params: GroupParams,
  participantDto: ParticipantCreateDto
) => {
  try {
    const participant = await createParticipantAndUser(params, participantDto)

    return participantToDto(participant)
  } catch (e) {
    if (isPrismaErrorForeignKeyConstraintFailed(e)) {
      throw new EntityNotFoundException('Group not found')
    }
    throw e
  }
}
