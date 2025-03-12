import { faker } from '@faker-js/faker'
import { randomUUID } from 'crypto'
import { StatusCodes } from 'http-status-codes'
import nock from 'nock'
import supertest from 'supertest'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import { EventBus } from '../../../core/event-bus/event-bus'
import logger from '../../../logger'
import { getSimulationPayload } from '../../simulations/__tests__/fixtures/simulations.fixtures'
import type { GroupCreateInputDto } from '../groups.validator'
import { CREATE_GROUP_ROUTE } from './fixtures/groups.fixture'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = CREATE_GROUP_ROUTE

  afterEach(async () => {
    await Promise.all([
      prisma.groupAdministrator.deleteMany(),
      prisma.groupParticipant.deleteMany(),
    ])
    await Promise.all([prisma.user.deleteMany(), prisma.group.deleteMany()])
  })

  describe('When creating his group', () => {
    describe('And no data provided', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent.post(url).expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And invalid email', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .post(url)
          .send({
            name: faker.company.name(),
            emoji: faker.internet.emoji(),
            administrator: {
              userId: faker.string.uuid(),
              email: 'Je ne donne jamais mon email',
              name: faker.person.fullName(),
            },
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And invalid administrator id', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .post(url)
          .send({
            name: faker.company.name(),
            emoji: faker.internet.emoji(),
            administrator: {
              userId: faker.string.alpha(34),
              name: faker.person.fullName(),
            },
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And invalid participant simulation id', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .post(url)
          .send({
            name: faker.company.name(),
            emoji: faker.internet.emoji(),
            administrator: {
              userId: faker.string.uuid(),
              name: faker.person.fullName(),
            },
            participants: [
              {
                simulation: {
                  ...getSimulationPayload(),
                  id: faker.string.alpha(34),
                },
              },
            ],
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And invalid participant simulation situation', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .post(url)
          .send({
            name: faker.company.name(),
            emoji: faker.internet.emoji(),
            administrator: {
              userId: faker.string.uuid(),
              name: faker.person.fullName(),
            },
            participants: [
              {
                simulation: {
                  ...getSimulationPayload(),
                  situation: null,
                },
              },
            ],
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And invalid participant simulation computedResults', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .post(url)
          .send({
            name: faker.company.name(),
            emoji: faker.internet.emoji(),
            administrator: {
              userId: faker.string.uuid(),
              name: faker.person.fullName(),
            },
            participants: [
              {
                simulation: {
                  ...getSimulationPayload(),
                  computedResults: null,
                },
              },
            ],
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And trying to add another participant than himself', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .post(url)
          .send({
            name: faker.company.name(),
            emoji: faker.internet.emoji(),
            administrator: {
              userId: faker.string.uuid(),
              name: faker.person.fullName(),
            },
            participants: [
              {
                userId: faker.string.uuid(),
                name: faker.person.fullName(),
                simulation: getSimulationPayload(),
              },
            ],
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And trying to add another simulation for himself', () => {
      test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .post(url)
          .send({
            name: faker.company.name(),
            emoji: faker.internet.emoji(),
            administrator: {
              userId: faker.string.uuid(),
              name: faker.person.fullName(),
            },
            participants: [
              {
                simulation: getSimulationPayload(),
              },
              {
                simulation: getSimulationPayload(),
              },
            ],
          })
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And he does not have a simulation', () => {
      test(`Then it returns a ${StatusCodes.CREATED} response with the created group`, async () => {
        const userId = faker.string.uuid()
        const name = faker.person.fullName()
        const payload: GroupCreateInputDto = {
          name: faker.company.name(),
          emoji: faker.internet.emoji(),
          administrator: {
            userId,
            name,
          },
        }

        const response = await agent
          .post(url)
          .send(payload)
          .expect(StatusCodes.CREATED)

        expect(response.body).toEqual({
          ...payload,
          id: expect.any(String),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          participants: [],
          administrator: {
            id: userId,
            name,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            email: null,
          },
        })
      })

      test('Then it stores a group in database', async () => {
        const userId = faker.string.uuid()
        const email = faker.internet.email().toLocaleLowerCase()
        const name = faker.person.fullName()
        const payload: GroupCreateInputDto = {
          name: faker.company.name(),
          emoji: faker.internet.emoji(),
          administrator: {
            userId,
            email,
            name,
          },
        }

        const {
          body: { id },
        } = await agent.post(url).send(payload).expect(StatusCodes.CREATED)

        const createdGroup = await prisma.group.findUnique({
          where: {
            id,
          },
          select: {
            id: true,
            name: true,
            emoji: true,
            administrator: {
              select: {
                user: true,
              },
            },
            participants: {
              select: {
                user: true,
              },
            },
            updatedAt: true,
            createdAt: true,
          },
        })

        expect(createdGroup).toEqual({
          ...payload,
          id,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          administrator: {
            user: {
              id: userId,
              name,
              email,
              createdAt: expect.any(Date),
              updatedAt: expect.any(Date),
            },
          },
          participants: [],
        })
      })

      describe('And leaving his/her email', () => {
        test('Then it does not send a creation email', async () => {
          const email = faker.internet.email().toLocaleLowerCase()
          const userId = faker.string.uuid()
          const name = faker.person.fullName()
          const payload: GroupCreateInputDto = {
            name: faker.company.name(),
            emoji: faker.internet.emoji(),
            administrator: {
              userId,
              email,
              name,
            },
          }

          await agent.post(url).send(payload).expect(StatusCodes.CREATED)
        })

        test('Then it does not add or update administrator contact in brevo', async () => {
          const email = faker.internet.email().toLocaleLowerCase()
          const userId = faker.string.uuid()
          const name = faker.person.fullName()
          const payload: GroupCreateInputDto = {
            name: faker.company.name(),
            emoji: faker.internet.emoji(),
            administrator: {
              userId,
              email,
              name,
            },
          }

          await agent.post(url).send(payload).expect(StatusCodes.CREATED)
        })
      })
    })

    describe('And he does have a simulation', () => {
      test(`Then it returns a ${StatusCodes.CREATED} response with the created group`, async () => {
        const userId = faker.string.uuid()
        const name = faker.person.fullName()
        const simulation = getSimulationPayload()
        const payload: GroupCreateInputDto = {
          name: faker.company.name(),
          emoji: faker.internet.emoji(),
          administrator: {
            userId,
            name,
          },
          participants: [
            {
              simulation,
            },
          ],
        }

        const response = await agent
          .post(url)
          .send(payload)
          .expect(StatusCodes.CREATED)

        expect(response.body).toEqual({
          ...payload,
          id: expect.any(String),
          administrator: {
            id: userId,
            name,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            email: null,
          },
          participants: [
            {
              id: expect.any(String),
              ...payload.administrator,
              email: null,
              simulation: {
                ...simulation,
                date: expect.any(String),
                createdAt: expect.any(String),
                updatedAt: expect.any(String),
                polls: [],
                foldedSteps: [],
                actionChoices: {},
                savedViaEmail: false,
                additionalQuestionsAnswers: [],
              },
              createdAt: expect.any(String),
              updatedAt: expect.any(String),
            },
          ],
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        })
      })

      test('Then it stores a group in database', async () => {
        const userId = faker.string.uuid()
        const email = faker.internet.email().toLocaleLowerCase()
        const name = faker.person.fullName()
        const simulation = getSimulationPayload()
        const payload: GroupCreateInputDto = {
          name: faker.company.name(),
          emoji: faker.internet.emoji(),
          administrator: {
            userId,
            email,
            name,
          },
          participants: [
            {
              simulation,
            },
          ],
        }

        nock(process.env.BREVO_URL!)
          .post('/v3/contacts')
          .reply(200)
          .post('/v3/contacts')
          .reply(200)
          .post('/v3/smtp/email')
          .reply(200)
          .post('/v3/contacts/lists/35/contacts/remove')
          .reply(200)

        const {
          body: { id },
        } = await agent.post(url).send(payload).expect(StatusCodes.CREATED)

        const createdGroup = await prisma.group.findUnique({
          where: {
            id,
          },
          select: {
            id: true,
            name: true,
            emoji: true,
            administrator: {
              select: {
                user: true,
              },
            },
            participants: {
              select: {
                id: true,
                simulationId: true,
                user: true,
              },
            },
            updatedAt: true,
            createdAt: true,
          },
        })

        expect(createdGroup).toEqual({
          ...payload,
          id,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          administrator: {
            user: {
              id: userId,
              name,
              email,
              createdAt: expect.any(Date),
              updatedAt: expect.any(Date),
            },
          },
          participants: [
            {
              id: expect.any(String),
              simulationId: simulation.id,
              user: {
                id: userId,
                name,
                email,
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date),
              },
            },
          ],
        })
      })

      describe('And leaving his/her email', () => {
        beforeEach(() => {
          jest
            .spyOn(prisma, '$transaction')
            .mockImplementationOnce((cb) => cb(prisma))
        })

        afterEach(() => {
          jest.spyOn(prisma, '$transaction').mockRestore()
        })

        test('Then it adds or updates group administrator in brevo', async () => {
          const email = faker.internet.email().toLocaleLowerCase()
          const userId = faker.string.uuid()
          const name = faker.person.fullName()
          const simulation = getSimulationPayload()
          const payload: GroupCreateInputDto = {
            name: faker.company.name(),
            emoji: faker.internet.emoji(),
            administrator: {
              userId,
              email,
              name,
            },
            participants: [
              {
                simulation,
              },
            ],
          }

          // Need to be sure that the group gets created with a known createdAt date
          const createdAt = new Date()

          jest
            .spyOn(prisma.group, 'create')
            .mockImplementationOnce((params) => {
              params.data.createdAt = createdAt

              jest.spyOn(prisma.group, 'create').mockRestore()

              return prisma.group.create(params)
            })

          const scope = nock(process.env.BREVO_URL!, {
            reqheaders: {
              'api-key': process.env.BREVO_API_KEY!,
            },
          })
            .post('/v3/smtp/email')
            .reply(200)
            .post('/v3/contacts', {
              email,
              listIds: [29],
              attributes: {
                USER_ID: userId,
                NUMBER_CREATED_GROUPS: 1,
                LAST_GROUP_CREATION_DATE: createdAt.toISOString(),
                NUMBER_CREATED_GROUPS_WITH_ONE_PARTICIPANT: 1,
                PRENOM: name,
              },
              updateEnabled: true,
            })
            .reply(200)
            .post('/v3/contacts/lists/35/contacts/remove')
            .reply(200)
            .post('/v3/contacts')
            .reply(200)

          await agent.post(url).send(payload).expect(StatusCodes.CREATED)

          await EventBus.flush()

          expect(scope.isDone()).toBeTruthy()
        })

        test('Then it updates group administrator simulation in brevo', async () => {
          const date = new Date()
          const email = faker.internet.email().toLocaleLowerCase()
          const userId = faker.string.uuid()
          const name = faker.person.fullName()
          const simulation = getSimulationPayload({ date })
          const { computedResults } = simulation
          const payload: GroupCreateInputDto = {
            name: faker.company.name(),
            emoji: faker.internet.emoji(),
            administrator: {
              userId,
              email,
              name,
            },
            participants: [
              {
                simulation,
              },
            ],
          }

          // Need to be sure that the group gets created with a known createdAt date
          const createdAt = new Date()

          jest
            .spyOn(prisma.group, 'create')
            .mockImplementationOnce((params) => {
              params.data.createdAt = createdAt

              jest.spyOn(prisma.group, 'create').mockRestore()

              return prisma.group.create(params)
            })

          const scope = nock(process.env.BREVO_URL!, {
            reqheaders: {
              'api-key': process.env.BREVO_API_KEY!,
            },
          })
            .post('/v3/contacts', {
              email,
              attributes: {
                USER_ID: userId,
                LAST_SIMULATION_DATE: date.toISOString(),
                ACTIONS_SELECTED_NUMBER: 0,
                LAST_SIMULATION_BILAN_FOOTPRINT: (
                  computedResults.carbone.bilan / 1000
                ).toLocaleString('fr-FR', {
                  maximumFractionDigits: 1,
                }),
                LAST_SIMULATION_TRANSPORTS_FOOTPRINT: (
                  computedResults.carbone.categories.transport / 1000
                ).toLocaleString('fr-FR', {
                  maximumFractionDigits: 1,
                }),
                LAST_SIMULATION_ALIMENTATION_FOOTPRINT: (
                  computedResults.carbone.categories.alimentation / 1000
                ).toLocaleString('fr-FR', {
                  maximumFractionDigits: 1,
                }),
                LAST_SIMULATION_LOGEMENT_FOOTPRINT: (
                  computedResults.carbone.categories.logement / 1000
                ).toLocaleString('fr-FR', {
                  maximumFractionDigits: 1,
                }),
                LAST_SIMULATION_DIVERS_FOOTPRINT: (
                  computedResults.carbone.categories.divers / 1000
                ).toLocaleString('fr-FR', {
                  maximumFractionDigits: 1,
                }),
                LAST_SIMULATION_SERVICES_FOOTPRINT: (
                  computedResults.carbone.categories['services sociétaux'] /
                  1000
                ).toLocaleString('fr-FR', {
                  maximumFractionDigits: 1,
                }),
                LAST_SIMULATION_BILAN_WATER: Math.round(
                  computedResults.eau.bilan / 365
                ).toString(),
                PRENOM: name,
              },
              updateEnabled: true,
            })
            .reply(200)
            .post('/v3/contacts/lists/35/contacts/remove', {
              emails: [email],
            })
            .reply(200)
            .post('/v3/contacts')
            .reply(200)
            .post('/v3/smtp/email')
            .reply(200)

          await agent.post(url).send(payload).expect(StatusCodes.CREATED)

          await EventBus.flush()

          expect(scope.isDone()).toBeTruthy()
        })

        test('Then it sends a creation email', async () => {
          const email = faker.internet.email().toLocaleLowerCase()
          const userId = faker.string.uuid()
          const name = faker.person.fullName()
          const simulation = getSimulationPayload()
          const payload: GroupCreateInputDto = {
            name: faker.company.name(),
            emoji: faker.internet.emoji(),
            administrator: {
              userId,
              email,
              name,
            },
            participants: [
              {
                simulation,
              },
            ],
          }

          // Need to be sure that the group gets created with a known id
          const groupId = randomUUID()

          jest
            .spyOn(prisma.group, 'create')
            .mockImplementationOnce((params) => {
              params.data.id = groupId

              jest.spyOn(prisma.group, 'create').mockRestore()

              return prisma.group.create(params)
            })

          const scope = nock(process.env.BREVO_URL!, {
            reqheaders: {
              'api-key': process.env.BREVO_API_KEY!,
            },
          })
            .post('/v3/smtp/email', {
              to: [
                {
                  name: email,
                  email,
                },
              ],
              templateId: 57,
              params: {
                GROUP_URL: `https://nosgestesclimat.fr/amis/resultats?groupId=${groupId}&mtm_campaign=email-automatise&mtm_kwd=groupe-admin-voir-classement`,
                SHARE_URL: `https://nosgestesclimat.fr/amis/invitation?groupId=${groupId}&mtm_campaign=email-automatise&mtm_kwd=groupe-admin-url-partage`,
                DELETE_URL: `https://nosgestesclimat.fr/amis/supprimer?groupId=${groupId}&userId=${userId}&mtm_campaign=email-automatise&mtm_kwd=groupe-admin-delete`,
                GROUP_NAME: payload.name,
                NAME: name,
              },
            })
            .reply(200)
            .post('/v3/contacts/lists/35/contacts/remove')
            .reply(200)
            .post('/v3/contacts')
            .reply(200)
            .post('/v3/contacts')
            .reply(200)

          await agent.post(url).send(payload).expect(StatusCodes.CREATED)

          await EventBus.flush()

          expect(scope.isDone()).toBeTruthy()
        })

        describe('And custom user origin (preprod)', () => {
          test('Then it sends a creation email', async () => {
            const email = faker.internet.email().toLocaleLowerCase()
            const userId = faker.string.uuid()
            const name = faker.person.fullName()
            const simulation = getSimulationPayload()
            const payload: GroupCreateInputDto = {
              name: faker.company.name(),
              emoji: faker.internet.emoji(),
              administrator: {
                userId,
                email,
                name,
              },
              participants: [
                {
                  simulation,
                },
              ],
            }

            // Need to be sure that the group gets created with a known id
            const groupId = randomUUID()

            jest
              .spyOn(prisma.group, 'create')
              .mockImplementationOnce((params) => {
                params.data.id = groupId

                jest.spyOn(prisma.group, 'create').mockRestore()

                return prisma.group.create(params)
              })

            const scope = nock(process.env.BREVO_URL!, {
              reqheaders: {
                'api-key': process.env.BREVO_API_KEY!,
              },
            })
              .post('/v3/smtp/email', {
                to: [
                  {
                    name: email,
                    email,
                  },
                ],
                templateId: 57,
                params: {
                  GROUP_URL: `https://preprod.nosgestesclimat.fr/amis/resultats?groupId=${groupId}&mtm_campaign=email-automatise&mtm_kwd=groupe-admin-voir-classement`,
                  SHARE_URL: `https://preprod.nosgestesclimat.fr/amis/invitation?groupId=${groupId}&mtm_campaign=email-automatise&mtm_kwd=groupe-admin-url-partage`,
                  DELETE_URL: `https://preprod.nosgestesclimat.fr/amis/supprimer?groupId=${groupId}&userId=${userId}&mtm_campaign=email-automatise&mtm_kwd=groupe-admin-delete`,
                  GROUP_NAME: payload.name,
                  NAME: name,
                },
              })
              .reply(200)
              .post('/v3/contacts/lists/35/contacts/remove')
              .reply(200)
              .post('/v3/contacts')
              .reply(200)
              .post('/v3/contacts')
              .reply(200)

            await agent
              .post(url)
              .set('origin', 'https://preprod.nosgestesclimat.fr')
              .send(payload)
              .expect(StatusCodes.CREATED)

            await EventBus.flush()

            expect(scope.isDone()).toBeTruthy()
          })
        })
      })
    })

    describe('And database failure', () => {
      const databaseError = new Error('Something went wrong')

      beforeEach(() => {
        jest.spyOn(prisma, '$transaction').mockRejectedValueOnce(databaseError)
      })

      afterEach(() => {
        jest.spyOn(prisma, '$transaction').mockRestore()
      })

      test(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} error`, async () => {
        await agent
          .post(url)
          .send({
            name: faker.company.name(),
            emoji: faker.internet.emoji(),
            administrator: {
              userId: faker.string.uuid(),
              name: faker.person.fullName(),
            },
          })
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)
      })

      test(`Then it logs the exception`, async () => {
        await agent.post(url).send({
          name: faker.company.name(),
          emoji: faker.internet.emoji(),
          administrator: {
            userId: faker.string.uuid(),
            name: faker.person.fullName(),
          },
        })

        expect(logger.error).toHaveBeenCalledWith(
          'Group creation failed',
          databaseError
        )
      })
    })
  })
})
