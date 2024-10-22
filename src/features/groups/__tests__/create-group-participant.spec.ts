import { faker } from '@faker-js/faker'
import { version as clientVersion } from '@prisma/client/package.json'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { StatusCodes } from 'http-status-codes'
import nock from 'nock'
import supertest from 'supertest'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import logger from '../../../logger'
import { getSimulationPayload } from '../../simulations/__tests__/fixtures/simulations.fixtures'
import type { ParticipantInputCreateDto } from '../groups.validator'
import {
  CREATE_PARTICIPANT_ROUTE,
  createGroup,
} from './fixtures/groups.fixture'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = CREATE_PARTICIPANT_ROUTE

  afterEach(() =>
    Promise.all([prisma.group.deleteMany(), prisma.user.deleteMany()])
  )

  describe("When trying to join another administrator's group", () => {
    describe('And group does not exist', () => {
      test(`Then it returns a ${StatusCodes.NOT_FOUND} error`, async () => {
        // This is not ideal but prismock does not handle this correctly
        jest.spyOn(prisma.groupParticipant, 'upsert').mockRejectedValueOnce(
          new PrismaClientKnownRequestError('ForeignKeyConstraintFailedError', {
            code: 'P2003',
            clientVersion,
          })
        )

        await agent
          .post(url.replace(':groupId', faker.database.mongodbObjectId()))
          .send({
            name: faker.person.fullName(),
            userId: faker.string.uuid(),
            simulation: getSimulationPayload(),
          })
          .expect(StatusCodes.NOT_FOUND)

        jest.spyOn(prisma.groupParticipant, 'upsert').mockRestore()

        // Cannot cover other expectation... prismock does not raise
      })
    })

    describe('And group does exist', () => {
      let groupId: string
      let groupName: string

      beforeEach(
        async () =>
          ({ id: groupId, name: groupName } = await createGroup({ agent }))
      )

      describe('And no data provided', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(url.replace(':groupId', groupId))
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And invalid email', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(url.replace(':groupId', groupId))
            .send({
              name: faker.person.fullName(),
              email: 'Je ne donne jamais mon email',
              userId: faker.string.uuid(),
              simulation: getSimulationPayload(),
            })
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And invalid user id', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(url.replace(':groupId', groupId))
            .send({
              name: faker.person.fullName(),
              userId: faker.string.alpha(34),
              simulation: getSimulationPayload(),
            })
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And invalid participant simulation id', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(url.replace(':groupId', groupId))
            .send({
              id: faker.string.uuid(),
              name: faker.person.fullName(),
              simulation: {
                ...getSimulationPayload(),
                id: faker.string.alpha(34),
              },
            })
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And invalid participant simulation situation', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(url.replace(':groupId', groupId))
            .send({
              id: faker.string.uuid(),
              name: faker.person.fullName(),
              simulation: {
                ...getSimulationPayload(),
                situation: null,
              },
            })
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      describe('And invalid participant simulation computedResults', () => {
        test(`Then it returns a ${StatusCodes.BAD_REQUEST} error`, async () => {
          await agent
            .post(url.replace(':groupId', groupId))
            .send({
              id: faker.string.uuid(),
              name: faker.person.fullName(),
              simulation: {
                ...getSimulationPayload(),
                computedResults: null,
              },
            })
            .expect(StatusCodes.BAD_REQUEST)
        })
      })

      test(`Then it returns a ${StatusCodes.CREATED} response with created participant`, async () => {
        const payload: ParticipantInputCreateDto = {
          name: faker.person.fullName(),
          userId: faker.string.uuid(),
          simulation: getSimulationPayload(),
        }

        const response = await agent
          .post(url.replace(':groupId', groupId))
          .send(payload)
          .expect(StatusCodes.CREATED)

        expect(response.body).toEqual({
          id: expect.any(String),
          ...payload,
          simulation: {
            ...payload.simulation,
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
          email: null,
        })
      })

      test(`Then it stores a participant in database`, async () => {
        const payload: ParticipantInputCreateDto = {
          userId: faker.string.uuid(),
          name: faker.person.fullName(),
          email: faker.internet.email().toLocaleLowerCase(),
          simulation: getSimulationPayload(),
        }

        nock(process.env.BREVO_URL!).post('/v3/smtp/email').reply(200)

        await agent
          .post(url.replace(':groupId', groupId))
          .send(payload)
          .expect(StatusCodes.CREATED)

        const createdParticipant = await prisma.groupParticipant.findUnique({
          where: {
            groupId_userId: {
              groupId,
              userId: payload.userId,
            },
          },
          select: {
            id: true,
            user: true,
            groupId: true,
            createdAt: true,
            updatedAt: true,
            simulationId: true,
          },
        })

        // createdAt are not instance of Date due to jest
        expect(createdParticipant).toEqual({
          id: expect.any(String),
          user: {
            id: payload.userId,
            name: payload.name,
            email: payload.email,
            createdAt: expect.anything(),
            updatedAt: null,
          },
          simulationId: payload.simulation.id,
          createdAt: expect.anything(),
          updatedAt: null,
          groupId,
        })
      })

      describe('And leaving his/her email', () => {
        test('Then it sends a join email', async () => {
          const email = faker.internet.email().toLocaleLowerCase()
          const userId = faker.string.uuid()
          const payload: ParticipantInputCreateDto = {
            email,
            userId,
            name: faker.person.fullName(),
            simulation: getSimulationPayload(),
          }

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
              templateId: 58,
              params: {
                GROUP_URL: `https://nosgestesclimat.fr/amis/resultats?groupId=${groupId}&mtm_campaign=email-automatise&mtm_kwd=groupe-invite-voir-classement`,
                SHARE_URL: `https://nosgestesclimat.fr/amis/invitation?groupId=${groupId}&mtm_campaign=email-automatise&mtm_kwd=groupe-invite-url-partage`,
                DELETE_URL: `https://nosgestesclimat.fr/amis/supprimer?groupId=${groupId}&userId=${userId}&mtm_campaign=email-automatise&mtm_kwd=groupe-invite-delete`,
                GROUP_NAME: groupName,
                NAME: payload.name,
              },
            })
            .reply(200)

          await agent
            .post(url.replace(':groupId', groupId))
            .send(payload)
            .expect(StatusCodes.CREATED)

          expect(scope.isDone()).toBeTruthy()
        })

        describe(`And incomplete simulation`, () => {
          test('Then it sends a continuation email', async () => {
            const email = faker.internet.email().toLocaleLowerCase()
            const userId = faker.string.uuid()
            const payload: ParticipantInputCreateDto = {
              email,
              userId,
              name: faker.person.fullName(),
              simulation: getSimulationPayload({
                progression: 0.5,
              }),
            }

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
                templateId: 102,
                params: {
                  SIMULATION_URL: `https://nosgestesclimat.fr/simulateur/bilan?sid=${payload.simulation.id}&mtm_campaign=email-automatise&mtm_kwd=pause-test-en-cours`,
                },
              })
              .reply(200)

            await agent
              .post(url.replace(':groupId', groupId))
              .send(payload)
              .expect(StatusCodes.CREATED)

            expect(scope.isDone()).toBeTruthy()
          })
        })

        describe('And custom user origin (preprod)', () => {
          test('Then it sends a join email', async () => {
            const email = faker.internet.email().toLocaleLowerCase()
            const userId = faker.string.uuid()
            const payload: ParticipantInputCreateDto = {
              email,
              userId,
              name: faker.person.fullName(),
              simulation: getSimulationPayload(),
            }

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
                templateId: 58,
                params: {
                  GROUP_URL: `https://preprod.nosgestesclimat.fr/amis/resultats?groupId=${groupId}&mtm_campaign=email-automatise&mtm_kwd=groupe-invite-voir-classement`,
                  SHARE_URL: `https://preprod.nosgestesclimat.fr/amis/invitation?groupId=${groupId}&mtm_campaign=email-automatise&mtm_kwd=groupe-invite-url-partage`,
                  DELETE_URL: `https://preprod.nosgestesclimat.fr/amis/supprimer?groupId=${groupId}&userId=${userId}&mtm_campaign=email-automatise&mtm_kwd=groupe-invite-delete`,
                  GROUP_NAME: groupName,
                  NAME: payload.name,
                },
              })
              .reply(200)

            await agent
              .post(url.replace(':groupId', groupId))
              .set('origin', 'https://preprod.nosgestesclimat.fr')
              .send(payload)
              .expect(StatusCodes.CREATED)

            expect(scope.isDone()).toBeTruthy()
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
            .post(url.replace(':groupId', groupId))
            .send({
              name: faker.person.fullName(),
              userId: faker.string.uuid(),
              simulation: getSimulationPayload(),
            })
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
        })

        test(`Then it logs the exception`, async () => {
          await agent.post(url.replace(':groupId', groupId)).send({
            name: faker.person.fullName(),
            userId: faker.string.uuid(),
            simulation: getSimulationPayload(),
          })

          expect(logger.error).toHaveBeenCalledWith(
            'Participant creation failed',
            databaseError
          )
        })
      })
    })
  })

  describe('When joining his own group', () => {
    let userId: string
    let userName: string
    let groupId: string

    beforeEach(
      async () =>
        ({
          id: groupId,
          administrator: { id: userId, name: userName },
        } = await createGroup({
          agent,
        }))
    )

    test(`Then it returns a ${StatusCodes.CREATED} response with created participant`, async () => {
      const payload: ParticipantInputCreateDto = {
        userId,
        name: userName,
        simulation: getSimulationPayload(),
      }

      const response = await agent
        .post(url.replace(':groupId', groupId))
        .send(payload)
        .expect(StatusCodes.CREATED)

      expect(response.body).toEqual({
        id: expect.any(String),
        ...payload,
        simulation: {
          ...payload.simulation,
          date: expect.any(String),
          createdAt: expect.any(String),
          updatedAt: null,
          polls: [],
          foldedSteps: [],
          actionChoices: {},
          savedViaEmail: false,
          additionalQuestionsAnswers: [],
        },
        email: null,
        createdAt: expect.any(String),
        updatedAt: null,
      })
    })
  })

  describe('When joining his own group And left his/her email', () => {
    let groupId: string
    let groupName: string
    let administratorId: string
    let administratorName: string
    let administratorEmail: string

    beforeEach(
      async () =>
        ({
          id: groupId,
          name: groupName,
          administrator: {
            id: administratorId,
            name: administratorName,
            email: administratorEmail,
          },
        } = await createGroup({
          agent,
          group: {
            administrator: {
              userId: faker.string.uuid(),
              email: faker.internet.email(),
              name: faker.person.fullName(),
            },
          },
        }))
    )

    test(`Then it returns a ${StatusCodes.CREATED} response with created participant`, async () => {
      const payload: ParticipantInputCreateDto = {
        userId: administratorId,
        name: administratorName,
        simulation: getSimulationPayload(),
      }

      nock(process.env.BREVO_URL!).post('/v3/smtp/email').reply(200)

      const response = await agent
        .post(url.replace(':groupId', groupId))
        .send(payload)
        .expect(StatusCodes.CREATED)

      expect(response.body).toEqual({
        id: expect.any(String),
        ...payload,
        simulation: {
          ...payload.simulation,
          date: expect.any(String),
          createdAt: expect.any(String),
          updatedAt: null,
          polls: [],
          foldedSteps: [],
          actionChoices: {},
          savedViaEmail: false,
          additionalQuestionsAnswers: [],
        },
        email: administratorEmail,
        createdAt: expect.any(String),
        updatedAt: null,
      })
    })

    test('Then it sends a creation email', async () => {
      const payload: ParticipantInputCreateDto = {
        userId: administratorId,
        name: administratorName,
        simulation: getSimulationPayload(),
      }

      const scope = nock(process.env.BREVO_URL!, {
        reqheaders: {
          'api-key': process.env.BREVO_API_KEY!,
        },
      })
        .post('/v3/smtp/email', {
          to: [
            {
              name: administratorEmail,
              email: administratorEmail,
            },
          ],
          templateId: 57,
          params: {
            GROUP_URL: `https://nosgestesclimat.fr/amis/resultats?groupId=${groupId}&mtm_campaign=email-automatise&mtm_kwd=groupe-admin-voir-classement`,
            SHARE_URL: `https://nosgestesclimat.fr/amis/invitation?groupId=${groupId}&mtm_campaign=email-automatise&mtm_kwd=groupe-admin-url-partage`,
            DELETE_URL: `https://nosgestesclimat.fr/amis/supprimer?groupId=${groupId}&userId=${administratorId}&mtm_campaign=email-automatise&mtm_kwd=groupe-admin-delete`,
            GROUP_NAME: groupName,
            NAME: administratorName,
          },
        })
        .reply(200)

      await agent
        .post(url.replace(':groupId', groupId))
        .send(payload)
        .expect(StatusCodes.CREATED)

      expect(scope.isDone()).toBeTruthy()
    })
  })
})
