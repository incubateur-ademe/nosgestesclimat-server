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
import { GroupDeletedEvent } from './events/GroupDeleted.event'
import { GroupUpdatedEvent } from './events/GroupUpdated.event'
import {
  createGroupAndUser,
  createParticipantAndUser,
  deleteParticipantById,
  deleteUserGroup,
  fetchUserGroup,
  fetchUserGroups,
  findGroupAndParticipantById,
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
  group: Awaited<ReturnType<typeof createGroupAndUser>>['group'],
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

type PopulatedParticipant = Awaited<ReturnType<typeof createParticipantAndUser>>

/**
 * Maps a database participant to a dto for the UI
 */
const participantToDto = (
  {
    id,
    simulation,
    user: { id: userId, ...rest },
    createdAt,
    updatedAt,
  }: Partial<PopulatedParticipant> & { user: PopulatedParticipant['user'] },
  connectedUser: string
) => ({
  ...(userId === connectedUser
    ? {
        id,
        simulation,
        userId,
        ...rest,
        createdAt,
        updatedAt,
      }
    : {
        id,
        name: rest.name,
        simulation,
      }),
})

const findGroupAndParticipant = async (params: UserGroupParticipantParams) => {
  try {
    return await findGroupAndParticipantById(params)
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('Group or participant not found')
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
  const { group, administrator, simulation } =
    await createGroupAndUser(groupDto)
  const { participants } = group

  const events = []

  const groupCreatedEvent = new GroupCreatedEvent({
    administrator,
    participants,
  })

  EventBus.emit(groupCreatedEvent)

  events.push(groupCreatedEvent)

  if (simulation) {
    const simulationUpsertedEvent = new SimulationUpsertedEvent({
      group,
      origin,
      simulation,
      administrator,
      sendEmail: true,
      user: administrator,
    })

    EventBus.emit(simulationUpsertedEvent)

    events.push(simulationUpsertedEvent)
  }

  await EventBus.once(...events)

  return groupToDto(group, groupDto.administrator.userId)
}

export const updateGroup = async (
  params: UserGroupParams,
  update: GroupUpdateDto
) => {
  try {
    const group = await updateUserGroup(params, update)
    const { participants } = group

    const groupUpdatedEvent = new GroupUpdatedEvent({
      administrator: group.administrator!.user,
      participants,
    })

    EventBus.emit(groupUpdatedEvent)

    await EventBus.once(groupUpdatedEvent)

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
    const {
      user,
      group,
      simulation,
      group: { participants },
    } = participant
    const administrator = group.administrator!.user

    const groupUpdatedEvent = new GroupUpdatedEvent({
      participantUser: user,
      administrator,
      participants,
    })

    const simulationUpsertedEvent = new SimulationUpsertedEvent({
      sendEmail: true,
      administrator,
      simulation,
      origin,
      group,
      user,
    })

    EventBus.emit(groupUpdatedEvent).emit(simulationUpsertedEvent)

    const events = [groupUpdatedEvent, simulationUpsertedEvent]

    await EventBus.once(...events)

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
    const {
      group: { administrator: admin },
      ...participant
    } = await findGroupAndParticipant(params)

    const administratorId = admin?.userId
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

    const {
      group: { participants, administrator },
      user: participantUser,
    } = await deleteParticipantById(params.participantId)

    const groupUpdatedEvent = new GroupUpdatedEvent({
      administrator: administrator!.user,
      participantUser,
      participants,
    })

    EventBus.emit(groupUpdatedEvent)

    await EventBus.once(groupUpdatedEvent)
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
    const { administrator, participants } = await deleteUserGroup(params)

    const groupDeletedEvent = new GroupDeletedEvent({
      administrator: administrator!.user,
      participants,
    })

    EventBus.emit(groupDeletedEvent)

    await EventBus.once(groupDeletedEvent)
  } catch (e) {
    if (isPrismaErrorNotFound(e)) {
      throw new EntityNotFoundException('Group not found')
    }
    throw e
  }
}
