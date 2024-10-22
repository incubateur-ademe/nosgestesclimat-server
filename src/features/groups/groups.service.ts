import { EntityNotFoundException } from '../../core/errors/EntityNotFoundException'
import { ForbiddenException } from '../../core/errors/ForbiddenException'
import { EventBus } from '../../core/event-bus/event-bus'
import {
  isPrismaErrorForeignKeyConstraintFailed,
  isPrismaErrorNotFound,
} from '../../core/typeguards/isPrismaError'
import { SimulationUpsertedEvent } from '../simulations/events/SimulationUpserted.event'
import type { UserParams } from '../users/users.validator'
import { GroupCreatedEvent } from './events/GroupCreated.event'
import {
  createGroupAndUser,
  createParticipantAndUser,
  deleteParticipantById,
  deleteUserGroup,
  fetchUserGroup,
  fetchUserGroups,
  findGroupById,
  findGroupParticipantById,
  updateUserGroup,
} from './groups.repository'
import type {
  GroupCreateDto,
  GroupParams,
  GroupsFetchQuery,
  GroupUpdateDto,
  ParticipantCreateDto,
  UserGroupParams,
  UserGroupParticipantParams,
} from './groups.validator'

/**
 * Maps a database group to a dto for the UI
 */
const groupToDto = (
  group: Awaited<ReturnType<typeof createGroupAndUser>>,
  connectedUser: string
) => ({
  ...group,
  administrator:
    group.administrator?.user.id === connectedUser
      ? group.administrator?.user
      : {
          name: group.administrator?.user.name,
        },
  participants: (group.participants || []).map((p) =>
    participantToDto(p, connectedUser)
  ),
})

/**
 * Maps a database participant to a dto for the UI
 */
const participantToDto = (
  {
    id,
    simulation,
    user: { id: userId, ...rest },
  }: Omit<Awaited<ReturnType<typeof createParticipantAndUser>>, 'group'>,
  connectedUser: string
) => ({
  ...(userId === connectedUser
    ? {
        id,
        simulation,
        userId,
        ...rest,
      }
    : {
        id,
        name: rest.name,
        simulation,
      }),
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

export const createGroup = async ({
  groupDto,
  origin,
}: {
  groupDto: GroupCreateDto
  origin: string
}) => {
  const group = await createGroupAndUser(groupDto)

  const groupCreatedEvent = new GroupCreatedEvent({
    group,
    origin,
  })

  EventBus.emit(groupCreatedEvent)

  await EventBus.once(groupCreatedEvent)

  return groupToDto(group, groupDto.administrator.userId)
}

export const updateGroup = async (
  params: UserGroupParams,
  update: GroupUpdateDto
) => {
  try {
    const group = await updateUserGroup(params, update)

    return groupToDto(group, params.userId)
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('Group not found')
    }
    throw e
  }
}

export const createParticipant = async ({
  origin,
  params,
  participantDto,
}: {
  origin: string
  params: GroupParams
  participantDto: ParticipantCreateDto
}) => {
  try {
    const participant = await createParticipantAndUser(params, participantDto)
    const { group, user, simulation } = participant
    const administrator = group.administrator!.user

    const simulationUpsertedEvent = new SimulationUpsertedEvent({
      administrator,
      simulation,
      origin,
      group,
      user,
    })

    EventBus.emit(simulationUpsertedEvent)

    await EventBus.once(simulationUpsertedEvent)

    return participantToDto(participant, participantDto.userId)
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

export const fetchGroups = async (
  params: UserParams,
  filters: GroupsFetchQuery
) => {
  const groups = await fetchUserGroups(params, filters)

  return groups.map((p) => groupToDto(p, params.userId))
}

export const fetchGroup = async (params: UserGroupParams) => {
  try {
    const group = await fetchUserGroup(params)

    return groupToDto(group, params.userId)
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('Group not found')
    }
    throw e
  }
}

export const deleteGroup = async (params: {
  userId: string
  groupId: string
}) => {
  try {
    return await deleteUserGroup(params)
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('Group not found')
    }
    throw e
  }
}
