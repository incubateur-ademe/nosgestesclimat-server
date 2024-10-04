import { faker } from '@faker-js/faker'
import { randomUUID } from 'crypto'
import { StatusCodes } from 'http-status-codes'
import nock from 'nock'
import supertest from 'supertest'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import logger from '../../../logger'
import { getSimulationPayload } from '../../simulations/__tests__/fixtures/simulations.fixtures'
import type { GroupCreateInputDto } from '../groups.validator'
import { CREATE_GROUP_ROUTE } from './fixtures/groups.fixture'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = CREATE_GROUP_ROUTE

  afterEach(() =>
    Promise.all([prisma.group.deleteMany(), prisma.user.deleteMany()])
  )

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
          updatedAt: null,
          participants: [],
          administrator: {
            id: userId,
            name,
            createdAt: expect.any(String),
            updatedAt: null,
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
        } = await agent.post(url).send(payload)

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

        // createdAt are not instance of Date due to jest
        expect(createdGroup).toEqual({
          ...payload,
          id,
          createdAt: expect.anything(),
          updatedAt: null,
          administrator: {
            user: {
              id: userId,
              name,
              email,
              createdAt: expect.anything(),
              updatedAt: null,
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

          const scope = nock(process.env.BREVO_URL!)
            .post('/v3/smtp/email')
            .reply(200)

          await agent.post(url).send(payload).expect(StatusCodes.CREATED)

          expect(scope.isDone()).toBeFalsy()
          nock.cleanAll()
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
            updatedAt: null,
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
                updatedAt: null,
                polls: [],
                foldedSteps: [],
                actionChoices: {},
                savedViaEmail: false,
                additionalQuestionsAnswers: [],
              },
              createdAt: expect.any(String),
              updatedAt: null,
            },
          ],
          createdAt: expect.any(String),
          updatedAt: null,
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

        nock(process.env.BREVO_URL!).post('/v3/smtp/email').reply(200)

        const {
          body: { id },
        } = await agent.post(url).send(payload)

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

        // createdAt are not instance of Date due to jest
        expect(createdGroup).toEqual({
          ...payload,
          id,
          createdAt: expect.anything(),
          updatedAt: null,
          administrator: {
            user: {
              id: userId,
              name,
              email,
              createdAt: expect.anything(),
              updatedAt: null,
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
                createdAt: expect.anything(),
                updatedAt: null,
              },
            },
          ],
        })
      })

      describe('And leaving his/her email', () => {
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

          await agent.post(url).send(payload).expect(StatusCodes.CREATED)

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

            await agent
              .post(url)
              .set('origin', 'https://preprod.nosgestesclimat.fr')
              .send(payload)
              .expect(StatusCodes.CREATED)

            expect(scope.isDone()).toBeTruthy()
          })
        })
      })
    })

    describe('And database failure', () => {
      const databaseError = new Error('Something went wrong')

      beforeEach(() => {
        jest.spyOn(prisma.user, 'upsert').mockRejectedValueOnce(databaseError)
      })

      afterEach(() => {
        jest.spyOn(prisma.user, 'upsert').mockRestore()
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
