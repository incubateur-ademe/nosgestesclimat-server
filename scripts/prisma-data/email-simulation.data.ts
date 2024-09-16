import mongoose from 'mongoose'
import z from 'zod'
import { prisma } from '../../src/adapters/prisma/client'
import { config } from '../../src/config'
import logger from '../../src/logger'
import EmailSimulation from '../../src/schemas/_legacy/EmailSimulationSchema'

const ComputedResultsSchema = z
  .object({
    categories: z
      .object({
        transport: z.number(),
        alimentation: z.number(),
        logement: z.number(),
        divers: z.number(),
        'services sociétaux': z.number(),
      })
      .strict(),
    bilan: z.number(),
  })
  .strict()

const ConferenceSchema = z.object({ room: z.string() }).strict()

const ConfigurationSchema = z
  .object({
    objectifs: z.array(z.string()),
    questions: z.record(z.string(), z.array(z.string())).optional(),
  })
  .strict()

const EnquêteSchema = z
  .object({ userID: z.string(), date: z.coerce.date() })
  .strict()

const EventsSentSchema = z.record(z.string(), z.boolean())

const LocalisationSchema = z
  .object({
    country: z
      .object({
        code: z.string(),
        name: z.string(),
      })
      .strict(),
  })
  .strict()

const PersonaSchema = z.union([
  z.string(),
  z
    .object({
      nom: z.string(),
      description: z.string(),
      icônes: z.string(),
      résumé: z.string().optional(),
      situation: z
        .record(z.string(), z.union([z.string(), z.number()]))
        .optional(),
    })
    .strict(),
])

const RatingSchema = z
  .object({
    learned: z.union([z.number(), z.string()]).optional(),
    action: z.union([z.number(), z.string()]).optional(),
  })
  .strict()

const SimulationSchema = z.record(
  z.string(),
  z.union([
    z.string().nullable(),
    z.number(),
    z.array(z.string()),
    ConfigurationSchema,
    EventsSentSchema,
    z.object({
      valeur: z.union([
        z.number().nullable(),
        z
          .string()
          .transform((value) => value.replace(/\s+/g, ''))
          .pipe(z.coerce.number())
          .nullable(),
      ]),
      unité: z.string().optional(),
    }),
    z
      .object({
        type: z.literal('number'),
        fullPrecision: z.boolean(),
        isNullable: z.boolean().optional(),
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
            nodeValue: z.number(),
            nodeKind: z.literal('constant'),
            rawNode: z
              .object({
                constant: z
                  .object({
                    type: z.literal('number'),
                    nodeValue: z.number(),
                  })
                  .strict(),
              })
              .strict(),
          })
          .strict(),
        unit: z
          .object({
            numerators: z.array(z.string()),
            denominators: z.array(z.string()),
          })
          .strict(),
        nodeKind: z.literal('unité'),
        rawNode: z.string(),
      })
      .strict(),
  ])
)

const StoredAmortissementAvionSchema = z.record(
  z.string(),
  z.record(z.string(), z.string())
)

const StoredTrajetsSchema = z.record(
  z.string(),
  z.array(
    z
      .object({
        motif: z.string(),
        label: z.string(),
        distance: z.coerce.number(),
        xfois: z.string(),
        periode: z.string(),
        personnes: z.coerce.number(),
        id: z.string(),
      })
      .strict()
  )
)

const SurveySchema = z.object({ room: z.string() }).strict()

const EmailSimulationSchema = z
  .object({
    _id: z.instanceof(mongoose.Types.ObjectId),
    createdAt: z.instanceof(Date),
    updatedAt: z.instanceof(Date),
    data: z
      .object({
        actionChoices: z.record(z.string(), z.boolean().nullable()).optional(),
        additionalQuestions: z.record(z.string(), z.string()).optional(),
        computedResults: ComputedResultsSchema.optional(),
        conference: ConferenceSchema.nullable().optional(),
        config: ConfigurationSchema.optional(),
        currentLang: z.string().optional(),
        date: z.coerce.date(),
        enquête: EnquêteSchema.nullable().optional(),
        eventsSent: EventsSentSchema.optional(),
        foldedSteps: z.array(z.string().nullable()).nullable().optional(),
        hiddenNotifications: z.array(z.string()).optional(),
        id: z.string(), // Should be uuid but data present is not
        localisation: LocalisationSchema.optional(),
        persona: PersonaSchema.nullable().optional(),
        poll: z.string().optional(),
        progression: z.number().optional(),
        ratings: RatingSchema.optional(),
        situation: SimulationSchema.optional(),
        storedAmortissementAvion: StoredAmortissementAvionSchema.optional(),
        storedTrajets: StoredTrajetsSchema.optional(),
        survey: SurveySchema.nullable().optional(),
        targetUnit: z.string().optional(),
        tutorials: z.record(z.string(), z.string()).optional(),
        unfoldedStep: z.string().nullable().optional(),
        unfoldedSteps: z.array(z.string()).nullable().optional(),
        url: z.string().optional(),
      })
      .strict()
      .optional(),
    __v: z.number(),
  })
  .strict()

const migrateEmailSimulationToPg = async () => {
  try {
    let documents = 0
    await mongoose.connect(config.mongo.url)

    const emailSimulations = EmailSimulation.find({})
      .lean()
      .cursor({ batchSize: 1000 })

    for await (const rawEmailSimulation of emailSimulations) {
      const emailSimulation = EmailSimulationSchema.parse(rawEmailSimulation)

      const id = emailSimulation._id.toString()
      const update = {
        data: emailSimulation.data || {},
        createdAt: emailSimulation.createdAt,
        updatedAt: emailSimulation.updatedAt,
      }

      await prisma.emailSimulation.upsert({
        where: {
          id,
        },
        create: {
          id,
          ...update,
        },
        update,
      })

      documents++
    }

    logger.info('EmailSimulations imported', { documents })
  } catch (error) {
    logger.error(error)
  } finally {
    await prisma.$disconnect()
    await mongoose.disconnect()
  }

  process.exit(0)
}

migrateEmailSimulationToPg()
