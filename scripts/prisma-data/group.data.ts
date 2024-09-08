import mongoose from 'mongoose'
import z, { ZodError } from 'zod'
import { prisma } from '../../src/adapters/prisma/client'
import { config } from '../../src/config'
import { isValidEmail } from '../../src/core/typeguards/isValidEmail'
import logger from '../../src/logger'
import { Group } from '../../src/schemas/GroupSchema'
import '../../src/schemas/SimulationSchema'

const AdministratorSchema = z
  .object({
    name: z.string(),
    email: z.string().optional(),
    userId: z.string().uuid(),
  })
  .strict()

const ParticipantSchema = z
  .object({
    _id: z.instanceof(mongoose.Types.ObjectId),
    name: z.string(),
    email: z.string().optional(),
    userId: z.string().uuid(),
    simulation: z
      .object({
        _id: z.instanceof(mongoose.Types.ObjectId),
        id: z.string().uuid(),
      })
      .strict()
      .nullable(),
  })
  .strict()

type Participant = z.infer<typeof ParticipantSchema>
type CorrectParticipant = Participant & {
  simulation: NonNullable<Participant['simulation']>
}

const GroupSchema = z
  .object({
    _id: z.instanceof(mongoose.Types.ObjectId),
    name: z.string(),
    emoji: z.string(),
    administrator: AdministratorSchema,
    participants: z.array(ParticipantSchema),
    members: z.tuple([]).optional(),
    createdAt: z.instanceof(Date),
    updatedAt: z.instanceof(Date),
    __v: z.number(),
  })
  .strict()

const migrateGroupToPg = async () => {
  let data
  try {
    let documents = 0
    let participantsWithoutSimulations = 0
    let invalidGroups = 0
    let emptyGroups = 0
    await mongoose.connect(config.mongo.url)

    const groups = Group.find({})
      .populate({
        path: 'participants.simulation',
        select: 'id',
      })
      .lean()
      .cursor({ batchSize: 1000 })

    for await (const rawGroup of groups) {
      data = rawGroup
      let group
      try {
        group = GroupSchema.parse(rawGroup)
      } catch (e) {
        if (
          !(e instanceof ZodError) ||
          !e.issues.every((i) => i.message === 'Invalid uuid') ||
          !e.issues.every((i) => i.path.join('.').endsWith('simulation.id'))
        ) {
          console.warn(
            'Group validation failed',
            JSON.stringify(rawGroup, null, 2)
          )
          console.warn(e)
        }

        invalidGroups++
        continue
      }

      const id = group._id.toString()
      const {
        emoji,
        createdAt,
        updatedAt,
        name: groupName,
        administrator: { name: administratorName, userId, email },
        participants,
      } = group

      const participantsWithSimulation: CorrectParticipant[] =
        participants.filter((p): p is CorrectParticipant => !!p.simulation)

      participantsWithoutSimulations +=
        participants.length - participantsWithSimulation.length

      const groupParticipants = new Set<string>()
      const correctParticipants = participantsWithSimulation.filter((p) => {
        if (groupParticipants.has(p.userId)) {
          return false
        }

        groupParticipants.add(p.userId)

        return true
      })

      if (correctParticipants.length === 0) {
        emptyGroups++
        continue
      }

      // Create users
      await Promise.all(
        [
          ...correctParticipants,
          { name: administratorName, email, userId },
        ].map(({ name, email, userId }) =>
          prisma.user.upsert({
            where: {
              id: userId,
            },
            create: {
              id: userId,
              name,
              ...(email && isValidEmail(email)
                ? { email: email.toLocaleLowerCase() }
                : {}),
            },
            update: {
              name,
              ...(email && isValidEmail(email)
                ? { email: email.toLocaleLowerCase() }
                : {}),
            },
          })
        )
      )

      await prisma.group.upsert({
        where: {
          id,
        },
        create: {
          id,
          emoji,
          name: groupName,
          administrator: {
            create: {
              userId,
              createdAt,
              updatedAt,
            },
          },
          participants: {
            createMany: {
              data: correctParticipants.map((participant) => ({
                userId: participant.userId,
                simulationId: participant.simulation.id,
                createdAt,
                updatedAt,
              })),
            },
          },
          createdAt,
          updatedAt,
        },
        update: {
          emoji,
          name: groupName,
          administrator: {
            update: {
              userId,
              createdAt,
              updatedAt,
            },
          },
          participants: {
            updateMany: correctParticipants.map((participant) => ({
              where: {
                groupId: id,
                userId: participant.userId,
              },
              data: {
                userId: participant.userId,
                simulationId: participant.simulation.id,
                createdAt,
                updatedAt,
              },
            })),
          },
          createdAt,
          updatedAt,
        },
      })

      documents++
    }

    logger.info('Groups imported', {
      documents,
      participantsWithoutSimulations,
      invalidGroups,
      emptyGroups,
    })
  } catch (error) {
    console.error(JSON.stringify(data, null, 2))
    console.error(error)
  } finally {
    await prisma.$disconnect()
    await mongoose.disconnect()
  }

  process.exit(0)
}

migrateGroupToPg()
