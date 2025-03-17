import { faker } from '@faker-js/faker'
import { StatusCodes } from 'http-status-codes'
import nock from 'nock'
import supertest from 'supertest'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import { EventBus } from '../../../core/event-bus/event-bus'
import logger from '../../../logger'
import { getSimulationPayload } from '../../simulations/__tests__/fixtures/simulations.fixtures'
import type { ParticipantInputCreateDto } from '../groups.validator'
import {
  CREATE_PARTICIPANT_ROUTE,
  createGroup,
  joinGroup,
} from './fixtures/groups.fixture'

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = CREATE_PARTICIPANT_ROUTE

  afterEach(async () => {
    await Promise.all([
      prisma.groupAdministrator.deleteMany(),
      prisma.groupParticipant.deleteMany(),
    ])
    await Promise.all([prisma.user.deleteMany(), prisma.group.deleteMany()])
  })

  describe("When trying to join another administrator's group", () => {
    describe('And group does not exist', () => {
      test(`Then it returns a ${StatusCodes.NOT_FOUND} error`, async () => {
        await agent
          .post(url.replace(':groupId', faker.database.mongodbObjectId()))
          .send({
            name: faker.person.fullName(),
            userId: faker.string.uuid(),
            simulation: getSimulationPayload(),
          })
          .expect(StatusCodes.NOT_FOUND)
      })
    })

    describe('And group does exist', () => {
      let groupId: string
      let groupName: string

      beforeEach(
        async () =>
          ({ id: groupId, name: groupName } = await createGroup({
            agent,
          }))
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
            updatedAt: expect.any(String),
            polls: [],
            foldedSteps: [],
            actionChoices: {},
            savedViaEmail: false,
            additionalQuestionsAnswers: [],
          },
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
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

        nock(process.env.BREVO_URL!)
          .post('/v3/smtp/email')
          .reply(200)
          .post('/v3/contacts')
          .reply(200)
          .post('/v3/contacts/lists/35/contacts/remove')
          .reply(200)

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

        expect(createdParticipant).toEqual({
          id: expect.any(String),
          user: {
            id: payload.userId,
            name: payload.name,
            email: payload.email,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          },
          simulationId: payload.simulation.id,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          groupId,
        })
      })

      describe('And leaving his/her email', () => {
        test('Then it adds or updates contact in brevo', async () => {
          const date = new Date()
          const userId = faker.string.uuid()
          const name = faker.person.fullName()
          const email = faker.internet.email().toLocaleLowerCase()
          const simulationPayload = getSimulationPayload({ date })
          const { computedResults } = simulationPayload
          const payload: ParticipantInputCreateDto = {
            name,
            email,
            userId,
            simulation: simulationPayload,
          }

          const scope = nock(process.env.BREVO_URL!, {
            reqheaders: {
              'api-key': process.env.BREVO_API_KEY!,
            },
          })
            .post('/v3/contacts', {
              email,
              listIds: [30],
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
            .post('/v3/smtp/email')
            .reply(200)

          await agent
            .post(url.replace(':groupId', groupId))
            .send(payload)
            .expect(StatusCodes.CREATED)

          await EventBus.flush()

          expect(scope.isDone()).toBeTruthy()
        })

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
            .post('/v3/contacts')
            .reply(200)
            .post('/v3/contacts/lists/35/contacts/remove')
            .reply(200)

          await agent
            .post(url.replace(':groupId', groupId))
            .send(payload)
            .expect(StatusCodes.CREATED)

          await EventBus.flush()

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

            await EventBus.flush()

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
              .post('/v3/contacts')
              .reply(200)
              .post('/v3/contacts/lists/35/contacts/remove')
              .reply(200)

            await agent
              .post(url.replace(':groupId', groupId))
              .set('origin', 'https://preprod.nosgestesclimat.fr')
              .send(payload)
              .expect(StatusCodes.CREATED)

            await EventBus.flush()

            expect(scope.isDone()).toBeTruthy()
          })
        })

        describe('And joining twice', () => {
          let participant: Awaited<ReturnType<typeof joinGroup>>

          beforeEach(async () => {
            participant = await joinGroup({
              agent,
              groupId,
              participant: {
                email: faker.internet.email(),
              },
            })
          })

          test(`Then it does not send email twice`, async () => {
            const {
              id: _1,
              createdAt: _2,
              updatedAt: _3,
              ...payload
            } = participant

            const scope = nock(process.env.BREVO_URL!)
              .post('/v3/contacts')
              .reply(200)
              .post('/v3/contacts/lists/35/contacts/remove')
              .reply(200)

            await agent
              .post(url.replace(':groupId', groupId))
              .send(payload)
              .expect(StatusCodes.CREATED)

            await EventBus.flush()

            expect(scope.isDone()).toBeTruthy()
          })

          describe('And from another device', () => {
            test(`Then it does not send email twice`, async () => {
              const { email } = participant
              const payload = {
                email,
                userId: faker.string.uuid(),
                name: faker.person.fullName(),
                simulation: getSimulationPayload(),
              }

              const scope = nock(process.env.BREVO_URL!)
                .post('/v3/contacts')
                .reply(200)
                .post('/v3/contacts/lists/35/contacts/remove')
                .reply(200)

              await agent
                .post(url.replace(':groupId', groupId))
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
          vi.spyOn(prisma, '$transaction').mockRejectedValueOnce(databaseError)
        })

        afterEach(() => {
          vi.spyOn(prisma, '$transaction').mockRestore()
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

    describe('And group does exist And administrator left his/her email', () => {
      let groupId: string
      let groupCreatedAt: string
      let administratorEmail: string
      let administratorId: string
      let administratorName: string

      beforeEach(async () => {
        const simulation = getSimulationPayload()
        ;({
          id: groupId,
          createdAt: groupCreatedAt,
          administrator: {
            id: administratorId,
            email: administratorEmail,
            name: administratorName,
          },
        } = await createGroup({
          agent,
          group: {
            administrator: {
              userId: faker.string.uuid(),
              email: faker.internet.email(),
              name: faker.person.fullName(),
            },
            participants: [{ simulation }],
          },
        }))
      })

      test('Then it updates group administrator in brevo', async () => {
        const payload: ParticipantInputCreateDto = {
          name: faker.person.fullName(),
          userId: faker.string.uuid(),
          simulation: getSimulationPayload(),
        }

        const scope = nock(process.env.BREVO_URL!, {
          reqheaders: {
            'api-key': process.env.BREVO_API_KEY!,
          },
        })
          .post('/v3/contacts', {
            email: administratorEmail,
            listIds: [29],
            attributes: {
              USER_ID: administratorId,
              NUMBER_CREATED_GROUPS: 1,
              LAST_GROUP_CREATION_DATE: groupCreatedAt,
              NUMBER_CREATED_GROUPS_WITH_ONE_PARTICIPANT: 0,
              PRENOM: administratorName,
            },
            updateEnabled: true,
          })
          .reply(200)

        await agent
          .post(url.replace(':groupId', groupId))
          .send(payload)
          .expect(StatusCodes.CREATED)

        await EventBus.flush()

        expect(scope.isDone()).toBeTruthy()
      })
    })

    describe('And group does exist And administrator left his/her email but did not join', () => {
      let groupId: string

      beforeEach(
        async () =>
          ({ id: groupId } = await createGroup({
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

      test('Then it does not update group administrator in brevo', async () => {
        const payload: ParticipantInputCreateDto = {
          name: faker.person.fullName(),
          userId: faker.string.uuid(),
          simulation: getSimulationPayload(),
        }

        await agent
          .post(url.replace(':groupId', groupId))
          .send(payload)
          .expect(StatusCodes.CREATED)
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
          updatedAt: expect.any(String),
          polls: [],
          foldedSteps: [],
          actionChoices: {},
          savedViaEmail: false,
          additionalQuestionsAnswers: [],
        },
        email: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      })
    })
  })

  describe('When joining his own group And left his/her email', () => {
    let groupId: string
    let groupName: string
    let groupCreatedAt: string
    let administratorId: string
    let administratorName: string
    let administratorEmail: string

    beforeEach(
      async () =>
        ({
          id: groupId,
          name: groupName,
          createdAt: groupCreatedAt,
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

      nock(process.env.BREVO_URL!)
        .post('/v3/smtp/email')
        .reply(200)
        .post('/v3/contacts')
        .reply(200)
        .post('/v3/contacts')
        .reply(200)
        .post('/v3/contacts/lists/35/contacts/remove')
        .reply(200)

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
          updatedAt: expect.any(String),
          polls: [],
          foldedSteps: [],
          actionChoices: {},
          savedViaEmail: false,
          additionalQuestionsAnswers: [],
        },
        email: administratorEmail,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      })
    })

    test('Then it updates group administrator in brevo', async () => {
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
        .post('/v3/contacts', {
          email: administratorEmail,
          listIds: [29],
          attributes: {
            USER_ID: administratorId,
            NUMBER_CREATED_GROUPS: 1,
            LAST_GROUP_CREATION_DATE: groupCreatedAt,
            NUMBER_CREATED_GROUPS_WITH_ONE_PARTICIPANT: 1,
            PRENOM: administratorName,
          },
          updateEnabled: true,
        })
        .reply(200)
        .post('/v3/smtp/email')
        .reply(200)
        .post('/v3/contacts')
        .reply(200)
        .post('/v3/contacts/lists/35/contacts/remove')
        .reply(200)

      await agent
        .post(url.replace(':groupId', groupId))
        .send(payload)
        .expect(StatusCodes.CREATED)

      await EventBus.flush()

      expect(scope.isDone()).toBeTruthy()
    })

    test('Then it updates group administrator simulation in brevo', async () => {
      const date = new Date()
      const simulation = getSimulationPayload({ date })
      const { computedResults } = simulation
      const payload: ParticipantInputCreateDto = {
        userId: administratorId,
        name: administratorName,
        simulation,
      }

      const scope = nock(process.env.BREVO_URL!, {
        reqheaders: {
          'api-key': process.env.BREVO_API_KEY!,
        },
      })
        .post('/v3/contacts', {
          email: administratorEmail,
          attributes: {
            USER_ID: administratorId,
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
              computedResults.carbone.categories['services sociétaux'] / 1000
            ).toLocaleString('fr-FR', {
              maximumFractionDigits: 1,
            }),
            LAST_SIMULATION_BILAN_WATER: Math.round(
              computedResults.eau.bilan / 365
            ).toString(),
            PRENOM: administratorName,
          },
          updateEnabled: true,
        })
        .reply(200)
        .post('/v3/contacts/lists/35/contacts/remove', {
          emails: [administratorEmail],
        })
        .reply(200)
        .post('/v3/smtp/email')
        .reply(200)
        .post('/v3/contacts')
        .reply(200)

      await agent
        .post(url.replace(':groupId', groupId))
        .send(payload)
        .expect(StatusCodes.CREATED)

      await EventBus.flush()

      expect(scope.isDone()).toBeTruthy()
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
        .post('/v3/contacts')
        .reply(200)
        .post('/v3/contacts')
        .reply(200)
        .post('/v3/contacts/lists/35/contacts/remove')
        .reply(200)

      await agent
        .post(url.replace(':groupId', groupId))
        .send(payload)
        .expect(StatusCodes.CREATED)

      await EventBus.flush()

      expect(scope.isDone()).toBeTruthy()
    })
  })
})
