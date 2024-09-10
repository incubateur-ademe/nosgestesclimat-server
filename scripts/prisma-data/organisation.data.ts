import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import mongoose from 'mongoose'
import slugify from 'slugify'
import z, { ZodError } from 'zod'
import { prisma } from '../../src/adapters/prisma/client'
import { config } from '../../src/config'
import { EMAIL_REGEX } from '../../src/core/typeguards/isValidEmail'
import logger from '../../src/logger'
import { Organisation } from '../../src/schemas/OrganisationSchema'
import '../../src/schemas/PollSchema'

const AdministratorSchema = z
  .object({
    _id: z.instanceof(mongoose.Types.ObjectId),
    name: z.string().optional(),
    email: z
      .string()
      .regex(EMAIL_REGEX)
      .transform((email) => email.toLocaleLowerCase()),
    telephone: z.string().optional(),
    position: z.string().optional(),
    hasOptedInForCommunications: z.boolean().optional(),
    userId: z.string().uuid(),
    verificationCode: z
      .object({
        _id: z.instanceof(mongoose.Types.ObjectId),
        code: z.string(),
        expirationDate: z.instanceof(Date),
        email: z
          .string()
          .regex(EMAIL_REGEX)
          .transform((email) => email.toLocaleLowerCase()),
        createdAt: z.instanceof(Date),
        updatedAt: z.instanceof(Date),
        __v: z.number(),
      })
      .strict()
      .optional(),
    createdAt: z.instanceof(Date).optional(),
    updatedAt: z.instanceof(Date).optional(),
  })
  .strict()

const PollSchema = z
  .object({
    _id: z.instanceof(mongoose.Types.ObjectId),
    name: z.string().max(150).optional(),
    slug: z.string().max(155).optional(),
    defaultAdditionalQuestions: z
      .array(z.union([z.literal('birthdate'), z.literal('postalCode')]))
      .optional(),
    customAdditionalQuestions: z
      .array(
        z
          .object({
            _id: z.instanceof(mongoose.Types.ObjectId),
            question: z.string().optional(),
            isEnabled: z.boolean().optional(),
          })
          .strict()
      )
      .optional(),
    expectedNumberOfParticipants: z.number().optional(),
    simulations: z.array(z.instanceof(mongoose.Types.ObjectId)).optional(),
    createdAt: z.instanceof(Date),
    updatedAt: z.instanceof(Date),
    __v: z.number(),
  })
  .strict()

const OrganisationType = z.union([
  z.literal('Association'),
  z.literal('Autre'),
  z.literal('Company'),
  z.literal('Cooperative'),
  z.literal('Coopérative'),
  z.literal('Empresa'),
  z.literal('Entreprise'),
  z.literal('Group of friends'),
  z.literal("Groupe d'amis"),
  z.literal('Public ou collectivité territoriale'),
  z.literal('University or school'),
  z.literal('Université ou école'),
])

type OrganisationType = z.infer<typeof OrganisationType>

const OrganisationSchema = z
  .object({
    _id: z.instanceof(mongoose.Types.ObjectId),
    name: z.string().max(150).optional(),
    slug: z.string().max(155).optional(),
    organisationType: OrganisationType.optional(),
    numberOfCollaborators: z.number().optional(),
    administrators: z.tuple([AdministratorSchema]),
    polls: z.array(PollSchema),
    createdAt: z.instanceof(Date),
    updatedAt: z.instanceof(Date),
    __v: z.number(),
  })
  .strict()

const getSlug = (name: string, map: Map<string, number>) => {
  const rawSlug = slugify(name.toLocaleLowerCase(), {
    strict: true,
  })

  if (map.has(rawSlug)) {
    const slug = `${rawSlug}-${map.get(rawSlug)}`
    map.set(rawSlug, (map.get(rawSlug) || 0) + 1)
    return slug
  }

  return rawSlug
}

const getOrganisationType = (type?: OrganisationType) => {
  if (!type) {
    return
  }

  switch (type) {
    case 'Association':
      return 'association'
    case 'Autre':
      return 'other'
    case 'Company':
    case 'Entreprise':
    case 'Empresa':
      return 'company'
    case 'Cooperative':
    case 'Coopérative':
      return 'cooperative'
    case 'Group of friends':
    case "Groupe d'amis":
      return 'groupOfFriends'
    case 'Public ou collectivité territoriale':
      return 'publicOrRegionalAuthority'
    case 'University or school':
    case 'Université ou école':
      return 'universityOrSchool'
    default:
      throw new Error(`unknown organisation type ${type}`)
  }
}

const migrateOrganisationToPg = async () => {
  let data
  try {
    let documents = 0
    let importedPolls = 0
    let notImportedDocuments = 0
    let notImportedPolls = 0
    await mongoose.connect(config.mongo.url)

    const organisations = Organisation.find({})
      .populate('polls')
      .lean()
      .cursor({ batchSize: 1000 })

    const organisationSlugMap = new Map<string, number>()
    const pollSlugMap = new Map<string, number>()

    for await (const rawOrganisation of organisations) {
      data = rawOrganisation
      let organisation
      try {
        organisation = OrganisationSchema.parse(rawOrganisation)
      } catch (e) {
        if (
          !(e instanceof ZodError) ||
          !e.issues.every((i) => i.message === 'Invalid uuid') ||
          !e.issues.every((i) =>
            i.path.join('.').endsWith('administrators.0.userId')
          )
        ) {
          console.warn(
            'Organisation validation failed',
            JSON.stringify(rawOrganisation, null, 2)
          )
          console.warn(e)

          continue
        }

        const {
          polls,
          administrators: [administrator],
        } = rawOrganisation

        if (!polls.length) {
          notImportedDocuments++
          continue
        }

        const { email } = administrator
        const possibleUsers = await prisma.user.findMany({
          where: {
            email,
          },
          select: {
            id: true,
          },
        })

        if (!possibleUsers.length) {
          console.warn(
            `Organisation administrator ${email} has no userId but found no possibleUser`
          )
          notImportedDocuments++
          notImportedPolls += polls.length || 0
          continue
        }

        const [{ id: userId }] = possibleUsers
        administrator.userId = userId
        organisation = OrganisationSchema.parse(rawOrganisation)
      }

      const {
        _id: organisationId,
        administrators,
        name: organisationName,
        numberOfCollaborators,
        organisationType,
        slug: organisationSlug,
        createdAt,
        updatedAt,
        polls,
      } = organisation

      await Promise.all(
        administrators.map(
          ({
            userId,
            name,
            email,
            position,
            telephone,
            hasOptedInForCommunications: optedInForCommunications,
          }) =>
            prisma.verifiedUser.upsert({
              where: {
                email,
              },
              create: {
                email,
                id: userId,
                name,
                position,
                telephone,
                optedInForCommunications,
                createdAt,
                updatedAt,
              },
              update: {
                id: userId,
                name,
                position,
                telephone,
                optedInForCommunications,
                createdAt,
                updatedAt,
              },
            })
        )
      )

      if (!organisationName && !organisationSlug && !polls.length) {
        /**
         * Organisation has been created
         * during verification code validation
         * but never updated
         * we ignore it as we already stored the verified user
         * and it is unused
         */
        notImportedDocuments++
        continue
      }

      const id = organisationId.toString()
      const name = organisationName || 'Organisation'
      const slug = organisationSlug || getSlug(name, organisationSlugMap)

      if (!organisationSlugMap.has(slug)) {
        organisationSlugMap.set(slug, 1)
      }

      await prisma.organisation.upsert({
        where: {
          id,
        },
        create: {
          id,
          name,
          slug,
          numberOfCollaborators,
          type: getOrganisationType(organisationType),
          administrators: {
            createMany: {
              data: administrators.map(({ email: userEmail }) => ({
                userEmail,
                createdAt,
                updatedAt,
              })),
            },
          },
          polls: {
            createMany: {
              data: polls.map(
                ({
                  _id,
                  name: pollName,
                  slug: pollSlug,
                  expectedNumberOfParticipants,
                  createdAt,
                  updatedAt,
                  customAdditionalQuestions,
                }) => {
                  const name = pollName || 'Campagne'
                  const slug = pollSlug || getSlug(name, pollSlugMap)

                  pollSlugMap.set(
                    slug,
                    (organisationSlugMap.get(slug) || 0) + 1
                  )

                  importedPolls++

                  customAdditionalQuestions = (
                    customAdditionalQuestions || []
                  ).filter(({ question }) => !!question)

                  return {
                    id: _id.toString(),
                    name,
                    slug,
                    expectedNumberOfParticipants,
                    createdAt,
                    updatedAt,
                    customAdditionalQuestions,
                  }
                }
              ),
            },
          },
        },
        update: {
          name,
          slug,
          numberOfCollaborators,
          type: getOrganisationType(organisationType),
        },
      })

      const chunkSize = 30
      for (let i = 0; i < polls.length; i += chunkSize) {
        const defaultAdditionalQuestionsChunk = polls
          .slice(i, i + chunkSize)
          .flatMap(
            ({ _id, defaultAdditionalQuestions, createdAt, updatedAt }) =>
              defaultAdditionalQuestions?.map((question) => ({
                _id,
                question,
                createdAt,
                updatedAt,
              })) || []
          )

        await Promise.all(
          defaultAdditionalQuestionsChunk.map(
            ({ _id, question, createdAt, updatedAt }) =>
              prisma.pollDefaultAdditionalQuestion
                .create({
                  data: {
                    type: question,
                    pollId: _id.toString(),
                    createdAt,
                    updatedAt,
                  },
                })
                .catch((e) => {
                  if (
                    e instanceof PrismaClientKnownRequestError &&
                    e.code === 'P2002'
                  ) {
                    // question already exists
                    return
                  }
                  throw e
                })
          )
        )
      }

      documents++
    }

    logger.info('Organisations imported', {
      documents,
      importedPolls,
      notImportedDocuments,
      notImportedPolls,
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

migrateOrganisationToPg()
