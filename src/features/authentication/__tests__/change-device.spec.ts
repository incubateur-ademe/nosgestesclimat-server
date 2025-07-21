import { faker } from '@faker-js/faker'
import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { prisma } from '../../../adapters/prisma/client.js'
import app from '../../../app.js'
import {
  createGroup,
  FETCH_USER_GROUPS_ROUTE,
  joinGroup,
} from '../../groups/__tests__/fixtures/groups.fixture.js'
import {
  createOrganisation,
  createOrganisationPoll,
  createOrganisationPollSimulation,
} from '../../organisations/__tests__/fixtures/organisations.fixture.js'
import {
  createSimulation,
  FETCH_USER_SIMULATIONS_ROUTE,
  getSimulationPayload,
} from '../../simulations/__tests__/fixtures/simulations.fixtures.js'
import { login } from './fixtures/login.fixture.js'

const agent = supertest(app)

describe('Given a ngc user', () => {
  afterEach(async () => {
    await Promise.all([
      prisma.groupAdministrator.deleteMany(),
      prisma.groupParticipant.deleteMany(),
      prisma.organisationAdministrator.deleteMany(),
      prisma.simulationPoll.deleteMany(),
    ])
    await Promise.all([
      prisma.group.deleteMany(),
      prisma.organisation.deleteMany(),
      prisma.user.deleteMany(),
      prisma.verifiedUser.deleteMany(),
      prisma.verificationCode.deleteMany(),
    ])
  })

  describe('And he/she creates a group leaving his/her email on device 1', () => {
    let groupDevice1: Awaited<ReturnType<typeof createGroup>>
    let simulationDevice1: Awaited<ReturnType<typeof createSimulation>>
    let cookieDevice1: string
    let userIdDevice1: string
    let email: string
    let name: string

    beforeEach(async () => {
      groupDevice1 = await createGroup({
        agent,
        group: {
          administrator: {
            userId: faker.string.uuid(),
            email: faker.internet.email(),
            name: faker.person.fullName(),
          },
          participants: [
            {
              simulation: getSimulationPayload(),
            },
          ],
        },
      })
      ;({
        administrator: { email, name, id: userIdDevice1 },
        participants: [{ simulation: simulationDevice1 }],
      } = groupDevice1)
      ;({ cookie: cookieDevice1 } = await login({
        agent,
        verificationCode: { email, userId: userIdDevice1 },
      }))
    })

    describe('And he/she logs in on a device 2', () => {
      let userId: string
      let cookie: string

      beforeEach(async () => {
        ;({ userId, cookie } = await login({
          agent,
          verificationCode: { email },
        }))
      })

      describe('When fetching his/her groups', () => {
        const url = FETCH_USER_GROUPS_ROUTE

        test('Then it returns group created on device 1', async () => {
          const response = await agent
            .get(url.replace(':userId', userId))
            .set('cookie', cookie)
            .expect(StatusCodes.OK)

          const [participant] = groupDevice1.participants
          expect(response.body).toEqual([
            {
              ...groupDevice1,
              administrator: {
                ...groupDevice1.administrator,
                id: userId,
              },
              participants: [
                {
                  ...participant,
                  simulation: {
                    ...participant.simulation,
                    updatedAt: expect.any(String),
                  },
                  userId,
                  updatedAt: expect.any(String),
                },
              ],
            },
          ])
        })
      })

      describe('When fetching his/her simulations', () => {
        const url = FETCH_USER_SIMULATIONS_ROUTE

        test('Then it returns simulation created on device 1', async () => {
          const response = await agent
            .get(url.replace(':userId', userId))
            .set('cookie', cookie)
            .expect(StatusCodes.OK)

          expect(response.body).toEqual([
            {
              ...simulationDevice1,
              updatedAt: expect.any(String),
              user: {
                name,
                email,
                id: userId,
              },
            },
          ])
        })
      })

      describe('And he/she gets back on device 1', () => {
        describe('When fetching his/her groups', () => {
          const url = FETCH_USER_GROUPS_ROUTE

          test('Then it returns empty array because associated to device 2', async () => {
            const response = await agent
              .get(url.replace(':userId', userIdDevice1))
              .expect(StatusCodes.OK)

            expect(response.body).toEqual([])
          })
        })

        describe('When fetching his/her simulations', () => {
          const url = FETCH_USER_SIMULATIONS_ROUTE

          test('Then it returns empty array because associated to device 2', async () => {
            const response = await agent
              .get(url.replace(':userId', userIdDevice1))
              .expect(StatusCodes.OK)

            expect(response.body).toEqual([])
          })
        })

        describe('And his/her cookie is still valid', () => {
          describe('When fetching his/her groups', () => {
            const url = FETCH_USER_GROUPS_ROUTE

            test('Then it returns group created on device 1', async () => {
              const response = await agent
                .get(url.replace(':userId', userIdDevice1))
                .set('cookie', cookieDevice1)
                .expect(StatusCodes.OK)

              const [participant] = groupDevice1.participants

              expect(response.body).toEqual([
                {
                  ...groupDevice1,
                  participants: [
                    {
                      ...participant,
                      simulation: {
                        ...participant.simulation,
                        updatedAt: expect.any(String),
                      },
                      updatedAt: expect.any(String),
                    },
                  ],
                },
              ])
            })
          })

          describe('When fetching his/her simulations', () => {
            const url = FETCH_USER_SIMULATIONS_ROUTE

            test('Then it returns simulation created on device 1', async () => {
              const response = await agent
                .get(url.replace(':userId', userIdDevice1))
                .set('cookie', cookieDevice1)
                .expect(StatusCodes.OK)

              expect(response.body).toEqual([
                {
                  ...simulationDevice1,
                  updatedAt: expect.any(String),
                  user: {
                    name,
                    email,
                    id: userIdDevice1,
                  },
                },
              ])
            })
          })
        })

        describe('And logs in again', () => {
          beforeEach(async () => {
            ;({ userId, cookie } = await login({
              agent,
              verificationCode: { email, userId: userIdDevice1 },
            }))
          })

          describe('When fetching his/her groups', () => {
            const url = FETCH_USER_GROUPS_ROUTE

            test('Then it returns group created on device 1', async () => {
              const response = await agent
                .get(url.replace(':userId', userId))
                .set('cookie', cookie)
                .expect(StatusCodes.OK)

              const [participant] = groupDevice1.participants
              expect(response.body).toEqual([
                {
                  ...groupDevice1,
                  administrator: {
                    ...groupDevice1.administrator,
                    id: userId,
                  },
                  participants: [
                    {
                      ...participant,
                      simulation: {
                        ...participant.simulation,
                        updatedAt: expect.any(String),
                      },
                      updatedAt: expect.any(String),
                      userId,
                    },
                  ],
                },
              ])
            })
          })

          describe('When fetching his/her simulations', () => {
            const url = FETCH_USER_SIMULATIONS_ROUTE

            test('Then it returns simulation created on device 1', async () => {
              const response = await agent
                .get(url.replace(':userId', userId))
                .set('cookie', cookie)
                .expect(StatusCodes.OK)

              expect(response.body).toEqual([
                {
                  ...simulationDevice1,
                  updatedAt: expect.any(String),
                  user: {
                    name,
                    email,
                    id: userId,
                  },
                },
              ])
            })
          })
        })
      })
    })

    describe(`And he/she creates another group on device 2 leaving his/her email`, () => {
      let groupDevice2: Awaited<ReturnType<typeof createGroup>>
      let userId: string

      beforeEach(async () => {
        groupDevice2 = await createGroup({
          agent,
          group: {
            administrator: {
              userId: faker.string.uuid(),
              email,
              name,
            },
            participants: [
              {
                simulation: getSimulationPayload(),
              },
            ],
          },
        })
        ;({
          administrator: { id: userId },
        } = groupDevice2)
      })

      describe('When fetching his/her groups', () => {
        const url = FETCH_USER_GROUPS_ROUTE

        test('Then it returns groups created on device 1 and 2', async () => {
          const response = await agent
            .get(url.replace(':userId', userId))
            .expect(StatusCodes.OK)

          const [participant] = groupDevice1.participants
          expect(response.body).toEqual([
            {
              ...groupDevice1,
              administrator: {
                ...groupDevice1.administrator,
                id: userId,
              },
              participants: [
                {
                  ...participant,
                  simulation: {
                    ...participant.simulation,
                    updatedAt: expect.any(String),
                  },
                  updatedAt: expect.any(String),
                  userId,
                },
              ],
            },
            {
              ...groupDevice2,
              administrator: {
                ...groupDevice2.administrator,
                createdAt: groupDevice1.administrator.createdAt,
                updatedAt: expect.any(String),
                id: userId,
              },
            },
          ])
        })
      })
    })

    describe(`And he/she joins the same group on device 2 not leaving his/her email`, () => {
      let participantDevice2: Awaited<ReturnType<typeof joinGroup>>
      let simulationDevice2: Awaited<ReturnType<typeof createSimulation>>
      let userIdDevice2: string

      beforeEach(async () => {
        participantDevice2 = await joinGroup({
          agent,
          participant: {
            name,
          },
          groupId: groupDevice1.id,
        })
        ;({ userId: userIdDevice2, simulation: simulationDevice2 } =
          participantDevice2)
      })

      describe(`And he/she leaves his/her email posting a simulation`, () => {
        beforeEach(async () => {
          await createSimulation({
            agent,
            simulation: {
              ...simulationDevice2,
              user: {
                ...simulationDevice2.user,
                email,
              },
            },
            userId: userIdDevice2,
          })
        })

        describe('When fetching his/her groups', () => {
          const url = FETCH_USER_GROUPS_ROUTE

          test('Then it returns updated group created on device 1', async () => {
            const response = await agent
              .get(url.replace(':userId', userIdDevice2))
              .expect(StatusCodes.OK)

            expect(response.body).toEqual([
              {
                ...groupDevice1,
                administrator: {
                  ...groupDevice1.administrator,
                  id: userIdDevice2,
                },
                participants: [
                  {
                    ...participantDevice2,
                    simulation: {
                      ...simulationDevice2,
                      updatedAt: expect.any(String),
                    },
                    email,
                    userId: userIdDevice2,
                    updatedAt: expect.any(String),
                  },
                ],
              },
            ])
          })
        })
      })
    })
  })

  describe('And he/she creates a simulation leaving his/her email on device 1', () => {
    let simulationDevice1: Awaited<ReturnType<typeof createSimulation>>
    let cookieDevice1: string
    let userIdDevice1: string
    let email: string

    beforeEach(async () => {
      simulationDevice1 = await createSimulation({
        agent,
        simulation: {
          user: {
            email: faker.internet.email(),
          },
        },
      })
      ;({
        user: { email, id: userIdDevice1 },
      } = simulationDevice1)
      ;({ cookie: cookieDevice1 } = await login({
        agent,
        verificationCode: { email, userId: userIdDevice1 },
      }))
    })

    describe('And he/she logs in on a device 2', () => {
      let userId: string
      let cookie: string

      beforeEach(async () => {
        ;({ userId, cookie } = await login({
          agent,
          verificationCode: { email },
        }))
      })

      describe('When fetching his/her simulations', () => {
        const url = FETCH_USER_SIMULATIONS_ROUTE

        test('Then it returns simulation created on device 1', async () => {
          const response = await agent
            .get(url.replace(':userId', userId))
            .set('cookie', cookie)
            .expect(StatusCodes.OK)

          expect(response.body).toEqual([
            {
              ...simulationDevice1,
              updatedAt: expect.any(String),
              user: {
                email,
                id: userId,
                name: null,
              },
            },
          ])
        })
      })

      describe('And he/she gets back on device 1', () => {
        describe('When fetching his/her simulations', () => {
          const url = FETCH_USER_SIMULATIONS_ROUTE

          test('Then it returns empty array because associated to device 2', async () => {
            const response = await agent
              .get(url.replace(':userId', userIdDevice1))
              .expect(StatusCodes.OK)

            expect(response.body).toEqual([])
          })
        })

        describe('And his/her cookie is still valid', () => {
          describe('When fetching his/her simulations', () => {
            const url = FETCH_USER_SIMULATIONS_ROUTE

            test('Then it returns simulation created on device 1', async () => {
              const response = await agent
                .get(url.replace(':userId', userIdDevice1))
                .set('cookie', cookieDevice1)
                .expect(StatusCodes.OK)

              expect(response.body).toEqual([
                {
                  ...simulationDevice1,
                  updatedAt: expect.any(String),
                  user: {
                    email,
                    id: userIdDevice1,
                    name: null,
                  },
                },
              ])
            })
          })
        })

        describe('And logs in again', () => {
          beforeEach(async () => {
            ;({ userId, cookie } = await login({
              agent,
              verificationCode: { email, userId: userIdDevice1 },
            }))
          })

          describe('When fetching his/her simulations', () => {
            const url = FETCH_USER_SIMULATIONS_ROUTE

            test('Then it returns simulation created on device 1', async () => {
              const response = await agent
                .get(url.replace(':userId', userId))
                .set('cookie', cookie)
                .expect(StatusCodes.OK)

              expect(response.body).toEqual([
                {
                  ...simulationDevice1,
                  updatedAt: expect.any(String),
                  user: {
                    email,
                    id: userId,
                    name: null,
                  },
                },
              ])
            })
          })
        })
      })
    })

    describe(`And he/she creates another simulation on device 2 leaving his/her email`, () => {
      let simulationDevice2: Awaited<ReturnType<typeof createSimulation>>
      let userId: string

      beforeEach(async () => {
        simulationDevice2 = await createSimulation({
          agent,
          simulation: {
            user: {
              email,
            },
          },
        })
        ;({
          user: { id: userId, email },
        } = simulationDevice2)
      })

      describe('When fetching his/her simulations', () => {
        const url = FETCH_USER_SIMULATIONS_ROUTE

        test('Then it returns simulation created on device 1 and 2', async () => {
          const response = await agent
            .get(url.replace(':userId', userId))
            .expect(StatusCodes.OK)

          expect(response.body).toEqual(
            expect.arrayContaining([
              {
                ...simulationDevice1,
                updatedAt: expect.any(String),
                user: {
                  ...simulationDevice1.user,
                  id: userId,
                },
              },
              simulationDevice2,
            ])
          )
        })
      })
    })
  })

  describe('And he/she joins a group leaving his/her email on device 1', () => {
    let participant: Omit<Awaited<ReturnType<typeof joinGroup>>, 'email'>
    let group: Awaited<ReturnType<typeof createGroup>>
    let email: string

    beforeEach(async () => {
      group = await createGroup({
        agent,
        group: { participants: [{ simulation: getSimulationPayload() }] },
      })
      ;({ email, ...participant } = await joinGroup({
        agent,
        groupId: group.id,
        participant: {
          email: faker.internet.email(),
        },
      }))
    })

    describe('And he/she joins the same group on device 2', () => {
      let simulation: Awaited<ReturnType<typeof createSimulation>>
      let userId: string
      let name: string

      beforeEach(async () => {
        ;({ userId, simulation, name } = await joinGroup({
          agent,
          groupId: group.id,
          participant: {
            email,
          },
        }))
      })

      describe('When fetching his/her groups', () => {
        const url = FETCH_USER_GROUPS_ROUTE

        test('Then it returns group joined on device 1 with updated user and simulation', async () => {
          const response = await agent
            .get(url.replace(':userId', userId))
            .expect(StatusCodes.OK)

          const [
            {
              email: _email,
              userId: _userId,
              updatedAt: _updatedAt,
              createdAt: _createdAt,
              ...administratorParticipant
            },
          ] = group.participants
          expect(response.body).toEqual([
            {
              ...group,
              administrator: {
                name: group.administrator.name,
              },
              participants: [
                administratorParticipant,
                {
                  ...participant,
                  updatedAt: expect.any(String),
                  simulation,
                  userId,
                  email,
                  name,
                },
              ],
            },
          ])
        })
      })

      describe('When fetching his/her simulations', () => {
        const url = FETCH_USER_SIMULATIONS_ROUTE

        test('Then it returns simulations created on device 1 and 2', async () => {
          const response = await agent
            .get(url.replace(':userId', userId))
            .expect(StatusCodes.OK)

          expect(response.body).toEqual(
            expect.arrayContaining([
              {
                ...participant.simulation,
                updatedAt: expect.any(String),
                user: {
                  id: userId,
                  email,
                  name,
                },
              },
              {
                ...simulation,
                updatedAt: expect.any(String),
                user: {
                  id: userId,
                  email,
                  name,
                },
              },
            ])
          )
        })
      })
    })
  })

  describe('And he/she participates to a poll leaving his/her email on device 1', () => {
    let simulationDevice1: Awaited<
      ReturnType<typeof createOrganisationPollSimulation>
    >
    let organisationId: string
    let cookie: string
    let pollId: string
    let email: string

    beforeEach(async () => {
      ;({ cookie } = await login({ agent }))
      ;({ id: organisationId } = await createOrganisation({
        agent,
        cookie,
      }))
      ;({ id: pollId } = await createOrganisationPoll({
        agent,
        cookie,
        organisationId,
      }))
      simulationDevice1 = await createOrganisationPollSimulation({
        agent,
        pollId,
        simulation: {
          user: {
            email: faker.internet.email(),
          },
        },
      })
      ;({
        user: { email },
      } = simulationDevice1)
    })

    describe('And he/she participants to the same poll on device 2', () => {
      let simulationDevice2: Awaited<
        ReturnType<typeof createOrganisationPollSimulation>
      >
      let simulationId: string
      let userId: string

      beforeEach(async () => {
        simulationDevice2 = await createOrganisationPollSimulation({
          agent,
          pollId,
          simulation: {
            user: {
              email,
            },
          },
        })
        ;({
          id: simulationId,
          user: { id: userId },
        } = simulationDevice2)
      })

      describe('When fetching the poll', () => {
        test('Then it returns device 2 participation only', async () => {
          // For now we don't have a route to fetch poll simulations

          const pollSimulations = await prisma.simulationPoll.findMany({
            where: {
              pollId,
            },
            select: {
              pollId: true,
              simulationId: true,
            },
          })

          expect(pollSimulations).toEqual([
            {
              pollId,
              simulationId,
            },
          ])
        })
      })

      describe('When fetching his/her simulations', () => {
        const url = FETCH_USER_SIMULATIONS_ROUTE

        test('Then it returns simulations created on device 1 and 2', async () => {
          const response = await agent
            .get(url.replace(':userId', userId))
            .expect(StatusCodes.OK)

          expect(response.body).toEqual(
            expect.arrayContaining([
              {
                ...simulationDevice1,
                updatedAt: expect.any(String),
                polls: [], // We deassociated the simulation from the poll to have only one
                user: {
                  id: userId,
                  name: null,
                  email,
                },
              },
              {
                ...simulationDevice2,
                updatedAt: expect.any(String),
              },
            ])
          )
        })
      })
    })
  })
})
