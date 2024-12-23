import { PollDefaultAdditionalQuestionType } from '@prisma/client'
import mongoose from 'mongoose'
import slugify from 'slugify'
import z, { ZodError } from 'zod'
import { prisma } from '../../src/adapters/prisma/client'
import { config } from '../../src/config'
import { EMAIL_REGEX } from '../../src/core/typeguards/isValidEmail'
import logger from '../../src/logger'
import { Organisation } from '../../src/schemas/OrganisationSchema'
import '../../src/schemas/PollSchema'

const getOrganisationType = (type?: string) => {
  if (!type) {
    return
  }

  switch (type) {
    case 'Association':
    case 'Asociación':
      return 'association'
    case 'Autre':
    case 'Other':
    case 'Otros':
      return 'other'
    case 'Company':
    case 'Entreprise':
    case 'Empresa':
      return 'company'
    case 'Coopérative':
    case 'Cooperative':
    case 'Cooperativa':
      return 'cooperative'
    case "Groupe d'amis":
    case 'Group of friends':
    case 'Grupo de amigos':
      return 'groupOfFriends'
    case 'Public ou collectivité territoriale':
    case 'Public or local authority':
    case 'Autoridad pública o local':
      return 'publicOrRegionalAuthority'
    case 'Université ou école':
    case 'University or school':
    case 'Universidad o escuela':
      return 'universityOrSchool'
    default:
      throw new Error(`unknown organisation type ${type}`)
  }
}

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
      .array(z.nativeEnum(PollDefaultAdditionalQuestionType))
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
  z.literal('Asociación'),
  z.literal('Autre'),
  z.literal('Other'),
  z.literal('Otros'),
  z.literal('Company'),
  z.literal('Entreprise'),
  z.literal('Empresa'),
  z.literal('Coopérative'),
  z.literal('Cooperative'),
  z.literal('Cooperativa'),
  z.literal("Groupe d'amis"),
  z.literal('Group of friends'),
  z.literal('Grupo de amigos'),
  z.literal('Public ou collectivité territoriale'),
  z.literal('Public or local authority'),
  z.literal('Autoridad pública o local'),
  z.literal('Université ou école'),
  z.literal('University or school'),
  z.literal('Universidad o escuela'),
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

const getSlug = (slug: string, set: Set<string>, count = 0): string => {
  let availableSlug: string
  if (count === 0) {
    availableSlug = slug = slugify(slug.toLocaleLowerCase(), {
      strict: true,
    })
  } else {
    availableSlug = `${slug}-${count}`
  }

  if (set.has(availableSlug)) {
    return getSlug(slug, set, count + 1)
  }

  set.add(availableSlug)

  return availableSlug
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

    const organisationSlugSet = new Set<string>()
    const pollSlugSet = new Set<string>()

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
      const existingOrganisation = await prisma.organisation.findUnique({
        where: {
          id,
        },
      })

      const name = organisationName || 'Organisation'
      const slug =
        organisationSlug ||
        existingOrganisation?.slug ||
        getSlug(name, organisationSlugSet)

      organisationSlugSet.add(slug)

      if (existingOrganisation) {
        await prisma.organisation.update({
          where: {
            id,
          },
          data: {
            name,
            slug,
            numberOfCollaborators,
            type: getOrganisationType(organisationType),
            administrators: {
              deleteMany: {
                organisationId: id,
              },
              createMany: {
                data: administrators.map(({ email: userEmail }) => ({
                  userEmail,
                  createdAt,
                  updatedAt,
                })),
              },
            },
            polls: {
              deleteMany: {
                organisationId: id,
              },
            },
          },
        })
      } else {
        await prisma.organisation.create({
          data: {
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
          },
        })
      }

      const chunkSize = 30
      for (let i = 0; i < polls.length; i += chunkSize) {
        const pollsChunk = polls.slice(i, i + chunkSize)

        await Promise.all(
          pollsChunk.map(
            ({
              _id,
              name: pollName,
              slug: pollSlug,
              expectedNumberOfParticipants,
              createdAt,
              updatedAt,
              customAdditionalQuestions,
              defaultAdditionalQuestions,
            }) => {
              const name = pollName || 'Campagne'
              const slug = pollSlug || getSlug(name, pollSlugSet)

              pollSlugSet.add(slug)

              importedPolls++

              customAdditionalQuestions = (
                customAdditionalQuestions || []
              ).filter(({ question }) => !!question)

              return prisma.poll.create({
                data: {
                  id: _id.toString(),
                  name,
                  slug,
                  organisationId: id,
                  expectedNumberOfParticipants,
                  createdAt,
                  updatedAt,
                  customAdditionalQuestions,
                  ...(!!defaultAdditionalQuestions?.length
                    ? {
                        defaultAdditionalQuestions: {
                          createMany: {
                            data: defaultAdditionalQuestions.map(
                              (question) => ({
                                type: question,
                                createdAt,
                                updatedAt,
                              })
                            ),
                          },
                        },
                      }
                    : {}),
                },
              })
            }
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
