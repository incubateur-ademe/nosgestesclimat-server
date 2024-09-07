import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException'
import { ForbiddenException } from '../../core/errors/ForbiddenException'
import {
  isPrismaErrorForeignKeyConstraintFailed,
  isPrismaErrorNotFound,
} from '../../core/typeguards/isPrismaError'
import {
  createGroupAndUser,
  createParticipantAndUser,
  deleteParticipantById,
  findGroupById,
  findGroupParticipantById,
  updateUserGroup,
} from './groups.repository'
import type {
  GroupCreateDto,
  GroupParams,
  GroupUpdateDto,
  ParticipantCreateDto,
  UserGroupParams,
  UserGroupParticipantParams,
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

const findGroup = async (groupId: string) => {
  try {
    return await findGroupById(groupId)
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('Group not found')
    }
    throw e
  }
}

const findGroupParticipant = async (groupId: string) => {
  try {
    return await findGroupParticipantById(groupId)
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('GroupParticipant not found')
    }
    throw e
  }
}

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

export const removeParticipant = async (params: UserGroupParticipantParams) => {
  try {
    const [group, participant] = await Promise.all([
      findGroup(params.groupId),
      findGroupParticipant(params.participantId),
    ])

    const administratorId = group.administrator?.userId
    const isConnectedUserGroupAdmin = params.userId === administratorId

    if (isConnectedUserGroupAdmin && administratorId === participant.userId) {
      throw new ForbiddenException(
        'Forbidden ! Administrator cannot leave group, delete it instead.'
      )
    }

    if (!isConnectedUserGroupAdmin && params.userId !== participant.userId) {
      throw new ForbiddenException(
        'Forbidden ! You cannot remove other participants from this group.'
      )
    }

    await deleteParticipantById(params.participantId)
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      // Participant already deleted
      return
    }
    throw e
  }
}
