import { Long } from 'mongodb'
import mongoose from 'mongoose'
import z, { ZodError } from 'zod'
import { prisma } from '../../src/adapters/prisma/client'
import { config } from '../../src/config'
import { isPrismaErrorInconsistentColumnData } from '../../src/core/typeguards/isPrismaError'
import {
  findVerifiedUser,
  getSimulationAdditionalQuestionsAnswers,
} from '../../src/helpers/queries/createOrUpdateSimulation'
import logger from '../../src/logger'
import { Poll } from '../../src/schemas/PollSchema'
import { Simulation } from '../../src/schemas/SimulationSchema'
import '../../src/schemas/UserSchema'

const categories = [
  'services sociétaux',
  'alimentation',
  'transport',
  'logement',
  'divers',
]

const excludedKeys = new Map<string, number>()

const CategoriesSchema = z
  .object({
    alimentation: z.number(),
    transport: z.number(),
    logement: z.number(),
    divers: z.number(),
    'services sociétaux': z.number(),
  })
  .strict()

const MetricComputedResultSchema = z
  .object({
    bilan: z.number(),
    categories: CategoriesSchema.optional(),
    subcategories: z.record(z.string(), z.number()).optional(),
  })
  .strict()

const ComputedResultSchema = z
  .object({
    carbone: MetricComputedResultSchema.optional(),
    eau: MetricComputedResultSchema.optional(),
  })
  .strict()

const OldSimulationDataSchema = z
  .object({
    answeredQuestions: z.array(z.string()).optional(),
    extraSituation: z
      .object({
        storedTrajets: z.record(z.string(), z.array(z.unknown())),
        actionChoices: z.object({}).strict(),
        storedAmortissementAvion: z.object({}).strict(),
      })
      .strict()
      .optional(),
    ratings: z
      .union([
        z
          .object({
            action: z.union([z.number().nullable(), z.string()]).optional(),
            learned: z.union([z.number().nullable(), z.string()]),
            learned_text: z.string().optional(),
          })
          .strict(),
        z
          .object({
            learned: z.union([z.number().nullable(), z.string()]).optional(),
            action: z.union([z.number().nullable(), z.string()]),
            action_text: z.string(),
          })
          .strict(),
      ])
      .optional(),
    results: z
      .object({
        categories: z.union([CategoriesSchema, z.array(z.number())]),
        total: z.number(),
        actionResults: z.record(z.string(), z.number().nullable()).optional(),
      })
      .strict()
      .optional(),
    situation: z
      .record(
        z.string(),
        z.union([
          z.string(),
          z.number(),
          z
            .object({
              valeur: z.number(),
              unité: z.string(),
            })
            .strict(),
        ])
      )
      .optional(),
  })
  .strict()

const SituationSchema = z
  .unknown()
  .transform((situation) => {
    if (!situation || typeof situation !== 'object') {
      return
    }

    return Object.entries(situation).reduce(
      (acc: Record<string, unknown>, [key, value]) => {
        if (categories.some((category) => key.startsWith(`${category} . `))) {
          acc[key] = value
        } else {
          excludedKeys.set(key, (excludedKeys.get(key) || 0) + 1)
        }
        return acc
      },
      {}
    )
  })
  .pipe(
    z.record(
      z.string(),
      z.union([
        z.string(),
        z.number(),
        z.instanceof(Long),
        z.undefined(),
        z
          .object({
            valeur: z.union([
              z.coerce.number(),
              z
                .string()
                .transform((s) => +s.replace(/\s/g, ''))
                .pipe(z.number()),
              z.instanceof(Long),
            ]),
            unité: z.string().optional(),
          })
          .strict(),
        z
          .object({
            type: z.literal('number'),
            fullPrecision: z.boolean(),
            isNullable: z.boolean().optional(),
            missingVariables: z.object({}).optional(),
            nodeValue: z.number(),
            nodeKind: z.literal('constant'),
            rawNode: z.number(),
          })
          .strict(),
        z
          .object({
            explanation: z
              .object({
                type: z.literal('number'),
                fullPrecision: z.boolean(),
                isNullable: z.boolean().optional(),
                missingVariables: z.object({}).optional(),
                nodeValue: z.number(),
                nodeKind: z.literal('constant'),
                rawNode: z
                  .object({
                    constant: z
                      .object({
                        type: z.union([
                          z.literal('constant'),
                          z.literal('number'),
                        ]),
                        nodeValue: z.number(),
                      })
                      .strict(),
                  })
                  .strict(),
              })
              .strict(),
            unit: z
              .object({
                numerators: z.union([
                  z.tuple([z.literal('ans')]),
                  z.tuple([z.literal('an')]),
                  z.tuple([z.literal('km')]),
                  z.tuple([z.literal('l')]),
                  z.tuple([z.literal('h')]),
                ]),
                denominators: z.union([
                  z.tuple([z.literal('an')]),
                  z.tuple([z.literal('year')]),
                  z.tuple([z.literal('semaine')]),
                  z.tuple([]),
                ]),
              })
              .strict(),
            nodeKind: z.literal('unité'),
            rawNode: z.string(),
          })
          .strict(),
      ])
    )
  )

const OldSimulationSchema = z
  .object({
    _id: z.instanceof(mongoose.Types.ObjectId),
    id: z.string(),
    data: OldSimulationDataSchema,
    computedResults: ComputedResultSchema,
    savedViaEmail: z.undefined().optional(),
    foldedSteps: z.array(z.string()),
    customAdditionalQuestionsAnswers: z.undefined().optional(),
    defaultAdditionalQuestionsAnswers: z.undefined().optional(),
    actionChoices: z.undefined().optional(),
    progression: z.undefined().optional(),
    date: z.undefined().optional(),
    group: z.undefined().optional(),
    groups: z.array(z.instanceof(mongoose.Types.ObjectId)),
    poll: z.undefined().optional(),
    polls: z.array(z.instanceof(mongoose.Types.ObjectId)),
    situation: z.object({}).strict(),
    createdAt: z.instanceof(Date),
    updatedAt: z.instanceof(Date),
    user: z.null().optional(),
    __v: z.number(),
  })
  .strict()

const NewSimulationSchema = z
  .object({
    _id: z.instanceof(mongoose.Types.ObjectId),
    id: z.string().uuid(),
    data: OldSimulationDataSchema.optional(),
    date: z.instanceof(Date),
    progression: z.number().optional(),
    savedViaEmail: z.boolean().optional(),
    computedResults: ComputedResultSchema.optional(),
    actionChoices: z.record(z.string(), z.boolean().nullable()).optional(),
    customAdditionalQuestionsAnswers: z
      .record(z.string(), z.string())
      .optional(),
    defaultAdditionalQuestionsAnswers: z
      .object({
        postalCode: z.string().optional(),
        birthdate: z.string().optional(),
      })
      .strict()
      .optional(),
    foldedSteps: z.array(z.string().nullable()),
    group: z.instanceof(mongoose.Types.ObjectId).optional().nullable(),
    groups: z.array(z.instanceof(mongoose.Types.ObjectId)),
    poll: z.instanceof(mongoose.Types.ObjectId).optional(),
    polls: z.array(z.instanceof(mongoose.Types.ObjectId)),
    situation: SituationSchema,
    user: z
      .object({
        _id: z.instanceof(mongoose.Types.ObjectId),
        userId: z.string().uuid(),
        email: z.string().optional(),
      })
      .optional(),
    createdAt: z.instanceof(Date),
    updatedAt: z.instanceof(Date),
    __v: z.number(),
  })
  .strict()

const InvalidSimulationSchema = z
  .object({
    _id: z.instanceof(mongoose.Types.ObjectId),
    id: z.string().uuid(),
    date: z.undefined().optional(),
    foldedSteps: z.tuple([]),
    customAdditionalQuestionsAnswers: z.undefined().optional(),
    defaultAdditionalQuestionsAnswers: z.undefined().optional(),
    situation: z.undefined().optional(),
    savedViaEmail: z.undefined().optional(),
    computedResults: z.undefined().optional(),
    progression: z.undefined().optional(),
    actionChoices: z.undefined().optional(),
    group: z.undefined().optional(),
    groups: z.tuple([]),
    poll: z.undefined().optional(),
    polls: z.tuple([]),
    user: z.null().optional(),
    createdAt: z.instanceof(Date),
    updatedAt: z.instanceof(Date),
    __v: z.number(),
  })
  .strict()

const SimulationSchema = z.union([
  OldSimulationSchema,
  NewSimulationSchema,
  InvalidSimulationSchema,
])

type SimulationSchema = z.infer<typeof SimulationSchema>

const findSimulationUserId = async (simulation: SimulationSchema) => {
  const { userId } = simulation.user || {}

  if (userId) {
    return userId
  }

  const { id: simulationId } = simulation

  try {
    const participant = await prisma.groupParticipant.findFirst({
      where: {
        simulationId,
      },
      select: {
        userId: true,
      },
    })

    return participant?.userId
  } catch (e) {
    // invalid simulation userId
    if (isPrismaErrorInconsistentColumnData(e)) {
      return
    }

    throw e
  }
}

const migrateSimulationToPg = async () => {
  let documents = 0
  let invalidUUIDs = 0
  let noAssociatedUser = 0
  let unknownPoll = 0
  const unknownPolls = new Set<string>()

  try {
    await mongoose.connect(config.mongo.url)

    const simulations = Simulation.find({})
      .populate({ path: 'user', select: ['userId', 'email'] })
      .lean()
      .cursor({ batchSize: 1000 })

    for await (const rawSimulation of simulations) {
      let simulation
      try {
        simulation = SimulationSchema.parse(rawSimulation)
      } catch (e) {
        if (
          !(e instanceof ZodError) ||
          !e.issues.every((i) => i.message === 'Invalid uuid') ||
          !e.issues.every((i) => i.path.join('.') === 'id')
        ) {
          throw e
        }

        invalidUUIDs++

        continue
      }

      const userId = await findSimulationUserId(simulation)

      if (!userId) {
        const { poll, polls, group, groups } = simulation

        if (!!poll || !!polls.length || !!group || !!groups.length) {
          logger.warn(
            `Could not find userId for simulation ${simulation._id} but simulation belongs to a poll or a group participant !`
          )
        }

        noAssociatedUser++

        continue
      }

      const {
        id,
        date,
        progression,
        situation = {},
        foldedSteps: rawFoldedSteps,
        customAdditionalQuestionsAnswers = {},
        defaultAdditionalQuestionsAnswers = {},
        savedViaEmail,
        computedResults = {},
        actionChoices = {},
        createdAt,
        updatedAt,
      } = simulation
      const { email } = await findVerifiedUser(userId, id)

      // Filter with typeguard does not work
      const foldedSteps = rawFoldedSteps.flatMap((s) => (s ? [s] : []))

      const additionalQuestionsAnswers =
        getSimulationAdditionalQuestionsAnswers({
          customAdditionalQuestionsAnswers,
          defaultAdditionalQuestionsAnswers,
        })

      const existingSimulation = await prisma.simulation.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          updatedAt: true,
        },
      })

      if (
        !!existingSimulation?.updatedAt &&
        existingSimulation.updatedAt > updatedAt
      ) {
        logger.warn(
          `Deduping same simulation. Id ${existingSimulation.id}, updatedAt ${existingSimulation.updatedAt.toISOString()} data updated at ${updatedAt.toISOString()}`
        )
        continue
      }

      if (existingSimulation) {
        await prisma.simulation.update({
          where: {
            id,
          },
          data: {
            date: date || createdAt,
            progression: progression || 0,
            computedResults,
            savedViaEmail: !!savedViaEmail,
            actionChoices,
            userId,
            situation,
            userEmail: email,
            polls: {
              deleteMany: {
                simulationId: id,
              },
            },
            foldedSteps,
            additionalQuestionsAnswers: {
              deleteMany: {
                simulationId: id,
              },
              ...(!!additionalQuestionsAnswers.length
                ? {
                    createMany: {
                      data: additionalQuestionsAnswers.map(
                        ({ type, key, answer }) => ({
                          type,
                          key,
                          answer,
                          updatedAt,
                          createdAt,
                        })
                      ),
                    },
                  }
                : {}),
            },
            updatedAt,
            createdAt,
          },
        })
      } else {
        await prisma.simulation.create({
          data: {
            id,
            date: date || createdAt,
            progression: progression || 0,
            computedResults,
            savedViaEmail: !!savedViaEmail,
            actionChoices,
            userId,
            situation,
            userEmail: email,
            foldedSteps,
            ...(!!additionalQuestionsAnswers.length
              ? {
                  additionalQuestionsAnswers: {
                    createMany: {
                      data: additionalQuestionsAnswers.map(
                        ({ type, key, answer }) => ({
                          type,
                          key,
                          answer,
                          updatedAt,
                          createdAt,
                        })
                      ),
                    },
                  },
                }
              : {}),
            updatedAt,
            createdAt,
          },
        })
      }

      // Retrieving all simulation polls
      const { polls, poll } = simulation

      const allPolls = new Set(
        [...(polls || []), ...(poll ? [poll] : [])].map((p) => p.toString())
      )

      // Adding all polls simulations
      const mongoPolls = await Poll.find(
        { simulations: simulation._id },
        { _id: true }
      ).lean()

      mongoPolls.forEach(({ _id }) => allPolls.add(_id.toString()))

      // double check poll still exists
      const postgrePolls = await prisma.poll.findMany({
        where: {
          id: {
            in: Array.from(allPolls),
          },
        },
        select: {
          id: true,
        },
      })

      if (allPolls.size !== postgrePolls.length) {
        unknownPoll += allPolls.size - postgrePolls.length

        postgrePolls.forEach(({ id }) => allPolls.delete(id))

        allPolls.forEach((id) => unknownPolls.add(id))
      }

      const chunkSize = 30

      for (let i = 0; i < postgrePolls.length; i += chunkSize) {
        const simulationPollsChunk = postgrePolls.slice(i, i + chunkSize)

        await prisma.simulationPoll.createMany({
          data: simulationPollsChunk.map(({ id: pollId }) => ({
            pollId,
            simulationId: id,
            createdAt,
            updatedAt,
          })),
        })
      }

      documents++
    }

    logger.info('Simulations imported', {
      documents,
      invalidUUIDs,
      noAssociatedUser,
      unknownPoll,
      unknownPolls: Array.from(unknownPolls),
    })
  } catch (error) {
    logger.error(error)
  } finally {
    await prisma.$disconnect()
    await mongoose.disconnect()
  }

  process.exit(0)
}

migrateSimulationToPg()
