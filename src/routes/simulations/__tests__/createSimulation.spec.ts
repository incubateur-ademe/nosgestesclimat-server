import { faker } from '@faker-js/faker'
import { StatusCodes } from 'http-status-codes'
import mongoose from 'mongoose'
import nock from 'nock'
import supertest from 'supertest'
import { prisma } from '../../../adapters/prisma/client'
import app from '../../../app'
import type { GroupType } from '../../../schemas/GroupSchema'
import { Group } from '../../../schemas/GroupSchema'
import type { OrganisationType } from '../../../schemas/OrganisationSchema'
import { Organisation } from '../../../schemas/OrganisationSchema'
import type { PollType } from '../../../schemas/PollSchema'
import { Poll } from '../../../schemas/PollSchema'
import { Simulation } from '../../../schemas/SimulationSchema'
import { CREATE_SIMULATION_ROUTE } from './fixtures/simulation.fixture'

const isoStringRegex =
  /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/

const simulationFinishedUrlRegex =
  /https:\/\/nosgestesclimat\.fr\/fin\?sid=[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}&mtm_campaign=email-automatise&mtm_kwd=fin-retrouver-simulation/

const simulationIncompleteUrlRegex =
  /https:\/\/nosgestesclimat\.fr\/simulateur\/bilan\?sid=[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}&mtm_campaign=email-automatise&mtm_kwd=pause-test-en-cours/

describe('Given a NGC user', () => {
  const agent = supertest(app)
  const url = CREATE_SIMULATION_ROUTE

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'warn').mockImplementation()
  })

  afterEach(async () => {
    await Promise.all([prisma.user.deleteMany(), prisma.group.deleteMany()])
    jest.restoreAllMocks()
  })

  describe('When he creates a simulation', () => {
    it(`Then it returns a ${StatusCodes.OK} with the created simulation`, async () => {
      const payload = {
        simulation: {
          id: faker.string.uuid(),
        },
        userId: faker.string.uuid(),
      }

      const { body } = await agent
        .post(url)
        .send(payload)
        .expect(StatusCodes.OK)

      expect(body).toEqual({
        __v: 0,
        _id: expect.any(String),
        createdAt: expect.any(String),
        date: expect.any(String),
        foldedSteps: [],
        groups: [],
        id: payload.simulation.id,
        polls: [],
        updatedAt: expect.any(String),
        user: expect.any(String),
      })
    })

    it('Then it stores a simulation in mongo', async () => {
      const payload = {
        simulation: {
          id: faker.string.uuid(),
        },
        userId: faker.string.uuid(),
      }

      const {
        body: { id: simulationId },
      } = await agent.post(url).send(payload).expect(StatusCodes.OK)

      const simulation = await Simulation.findOne({
        id: simulationId,
      }).lean()

      expect(simulation).toEqual({
        __v: expect.any(Number),
        _id: expect.any(mongoose.Types.ObjectId),
        actionChoices: {},
        createdAt: expect.any(Date),
        customAdditionalQuestionsAnswers: {},
        date: expect.any(Date),
        defaultAdditionalQuestionsAnswers: {},
        foldedSteps: [],
        groups: [],
        id: simulationId,
        polls: [],
        situation: {},
        updatedAt: expect.any(Date),
        user: expect.any(mongoose.Types.ObjectId),
      })
    })

    it('Then it stores a simulation in postgres', async () => {
      const payload = {
        simulation: {
          id: faker.string.uuid(),
        },
        userId: faker.string.uuid(),
      }

      const {
        body: { id: simulationId },
      } = await agent.post(url).send(payload).expect(StatusCodes.OK)

      const simulation = await prisma.simulation.findUnique({
        where: {
          id: simulationId,
        },
      })

      // dates are not instance of Date due to jest
      expect(simulation).toEqual({
        actionChoices: {},
        computedResults: null,
        createdAt: expect.anything(),
        date: expect.anything(),
        foldedSteps: [],
        id: simulationId,
        progression: null,
        savedViaEmail: false,
        situation: {},
        updatedAt: null,
        userEmail: null,
        userId: expect.any(String),
      })
    })

    describe('And leaving his email And asking to sendEmail', () => {
      describe('And finished simulation', () => {
        it(`Then it does send a creation email`, async () => {
          const payload = {
            simulation: {
              id: faker.string.uuid(),
              progression: 1,
              date: new Date(),
            },
            email: faker.internet.email().toLocaleLowerCase(),
            userId: faker.string.uuid(),
            shouldSendSimulationEmail: true,
          }

          const scope = nock(process.env.BREVO_URL!, {
            reqheaders: {
              'api-key': process.env.BREVO_API_KEY!,
            },
          })
            .post('/v3/contacts', {
              email: payload.email,
              attributes: {
                USER_ID: payload.userId,
                LAST_SIMULATION_DATE: isoStringRegex,
                ACTIONS_SELECTED_NUMBER: 0,
                LAST_SIMULATION_BILAN_FOOTPRINT: '0',
                LAST_SIMULATION_TRANSPORTS_FOOTPRINT: '0',
                LAST_SIMULATION_ALIMENTATION_FOOTPRINT: '0',
                LAST_SIMULATION_LOGEMENT_FOOTPRINT: '0',
                LAST_SIMULATION_DIVERS_FOOTPRINT: '0',
                LAST_SIMULATION_SERVICES_FOOTPRINT: '0',
                LAST_SIMULATION_BILAN_WATER: '0',
              },
              updateEnabled: true,
            })
            .reply(200)
            .post('/v3/contacts', {
              email: payload.email,
              listIds: [22],
              attributes: {
                OPT_IN: true,
                USER_ID: payload.userId,
              },
              updateEnabled: true,
            })
            .reply(200)
            .post('/v3/smtp/email', {
              to: [
                {
                  name: payload.email,
                  email: payload.email,
                },
              ],
              templateId: 55,
              params: {
                SIMULATION_URL: simulationFinishedUrlRegex,
              },
            })
            .reply(200)

          await agent.post(url).send(payload).expect(StatusCodes.OK)

          expect(scope.isDone()).toBeTruthy()
        })
      })

      describe('And unfinished simulation', () => {
        it(`Then it does send a continuation email`, async () => {
          const payload = {
            simulation: {
              id: faker.string.uuid(),
              progression: 0.5,
              date: new Date(),
            },
            email: faker.internet.email().toLocaleLowerCase(),
            userId: faker.string.uuid(),
            shouldSendSimulationEmail: true,
          }

          const scope = nock(process.env.BREVO_URL!, {
            reqheaders: {
              'api-key': process.env.BREVO_API_KEY!,
            },
          })
            .post('/v3/contacts', {
              email: payload.email,
              attributes: {
                USER_ID: payload.userId,
                LAST_SIMULATION_DATE: isoStringRegex,
                ACTIONS_SELECTED_NUMBER: 0,
                LAST_SIMULATION_BILAN_FOOTPRINT: '0',
                LAST_SIMULATION_TRANSPORTS_FOOTPRINT: '0',
                LAST_SIMULATION_ALIMENTATION_FOOTPRINT: '0',
                LAST_SIMULATION_LOGEMENT_FOOTPRINT: '0',
                LAST_SIMULATION_DIVERS_FOOTPRINT: '0',
                LAST_SIMULATION_SERVICES_FOOTPRINT: '0',
                LAST_SIMULATION_BILAN_WATER: '0',
              },
              updateEnabled: true,
            })
            .reply(200)
            .post('/v3/contacts', {
              email: payload.email,
              listIds: [35],
              attributes: {
                OPT_IN: true,
                USER_ID: payload.userId,
              },
              updateEnabled: true,
            })
            .reply(200)
            .post('/v3/smtp/email', {
              to: [
                {
                  name: payload.email,
                  email: payload.email,
                },
              ],
              templateId: 102,
              params: {
                SIMULATION_URL: simulationIncompleteUrlRegex,
              },
            })
            .reply(200)

          await agent.post(url).send(payload).expect(StatusCodes.OK)

          expect(scope.isDone()).toBeTruthy()
        })
      })
    })
  })

  describe('When he creates a simulation in a poll', () => {
    let organisation: OrganisationType
    let organisationAdministrator: { name: string; email: string }
    let poll: PollType

    beforeEach(async () => {
      poll = await Poll.create({
        name: 'poll',
        slug: 'poll',
      })

      organisationAdministrator = {
        name: faker.person.fullName(),
        email: faker.internet.email().toLocaleLowerCase(),
      }

      organisation = await Organisation.create({
        name: 'organisation',
        slug: 'organisation',
        administrators: [organisationAdministrator],
        polls: [poll._id],
      })
    })

    afterEach(() => Promise.all([Organisation.deleteMany(), Poll.deleteMany()]))

    it(`Then it returns a ${StatusCodes.OK} with the created simulation`, async () => {
      const payload = {
        simulation: {
          id: faker.string.uuid(),
          polls: [poll.slug],
        },
        userId: faker.string.uuid(),
      }

      nock(process.env.BREVO_URL!).post('/v3/contacts').reply(200)

      const { body } = await agent
        .post(url)
        .send(payload)
        .expect(StatusCodes.OK)

      expect(body).toEqual({
        __v: 0,
        _id: expect.any(String),
        createdAt: expect.any(String),
        date: expect.any(String),
        foldedSteps: [],
        groups: [],
        id: payload.simulation.id,
        polls: [poll.slug],
        updatedAt: expect.any(String),
        user: expect.any(String),
      })
    })

    describe('And finished simulation', () => {
      it(`Then it does send a poll participation email`, async () => {
        const payload = {
          simulation: {
            id: faker.string.uuid(),
            progression: 1,
            date: new Date(),
            polls: [poll.slug],
          },
          email: faker.internet.email().toLocaleLowerCase(),
          userId: faker.string.uuid(),
        }

        const scope = nock(process.env.BREVO_URL!, {
          reqheaders: {
            'api-key': process.env.BREVO_API_KEY!,
          },
        })
          .post('/v3/contacts', {
            email: payload.email,
            attributes: {
              USER_ID: payload.userId,
              LAST_SIMULATION_DATE: isoStringRegex,
              ACTIONS_SELECTED_NUMBER: 0,
              LAST_SIMULATION_BILAN_FOOTPRINT: '0',
              LAST_SIMULATION_TRANSPORTS_FOOTPRINT: '0',
              LAST_SIMULATION_ALIMENTATION_FOOTPRINT: '0',
              LAST_SIMULATION_LOGEMENT_FOOTPRINT: '0',
              LAST_SIMULATION_DIVERS_FOOTPRINT: '0',
              LAST_SIMULATION_SERVICES_FOOTPRINT: '0',
              LAST_SIMULATION_BILAN_WATER: '0',
            },
            updateEnabled: true,
          })
          .reply(200)
          .post('/v3/contacts', {
            email: organisationAdministrator.email,
            attributes: {
              LAST_POLL_PARTICIPANTS_NUMBER: 1,
            },
            updateEnabled: true,
          })
          .reply(200)
          .post('/v3/smtp/email', {
            to: [
              {
                name: payload.email,
                email: payload.email,
              },
            ],
            templateId: 71,
            params: {
              ORGANISATION_NAME: organisation.name,
              DETAILED_VIEW_URL: `https://nosgestesclimat.fr/organisations/${organisation.slug}/resultats-detailles?mtm_campaign=email-automatise&mtm_kwd=orga-invite-campagne`,
            },
          })
          .reply(200)

        await agent.post(url).send(payload).expect(StatusCodes.OK)

        expect(scope.isDone()).toBeTruthy()
      })
    })

    describe('And unfinished simulation', () => {
      it(`Then it does not send a poll participation email`, async () => {
        const payload = {
          simulation: {
            id: faker.string.uuid(),
            progression: 0.5,
            date: new Date(),
            polls: [poll.slug],
          },
          email: faker.internet.email().toLocaleLowerCase(),
          userId: faker.string.uuid(),
        }

        const scope = nock(process.env.BREVO_URL!, {
          reqheaders: {
            'api-key': process.env.BREVO_API_KEY!,
          },
        })
          .post('/v3/contacts', {
            email: payload.email,
            attributes: {
              USER_ID: payload.userId,
              LAST_SIMULATION_DATE: isoStringRegex,
              ACTIONS_SELECTED_NUMBER: 0,
              LAST_SIMULATION_BILAN_FOOTPRINT: '0',
              LAST_SIMULATION_TRANSPORTS_FOOTPRINT: '0',
              LAST_SIMULATION_ALIMENTATION_FOOTPRINT: '0',
              LAST_SIMULATION_LOGEMENT_FOOTPRINT: '0',
              LAST_SIMULATION_DIVERS_FOOTPRINT: '0',
              LAST_SIMULATION_SERVICES_FOOTPRINT: '0',
              LAST_SIMULATION_BILAN_WATER: '0',
            },
            updateEnabled: true,
          })
          .reply(200)
          .post('/v3/contacts', {
            email: organisationAdministrator.email,
            attributes: {
              LAST_POLL_PARTICIPANTS_NUMBER: 1,
            },
            updateEnabled: true,
          })
          .reply(200)

        await agent.post(url).send(payload).expect(StatusCodes.OK)

        expect(scope.isDone()).toBeTruthy()
      })
    })
  })

  describe('When he creates a simulation in a group', () => {
    let group: GroupType
    let groupAdministrator: NonNullable<GroupType['administrator']>

    beforeEach(async () => {
      groupAdministrator = {
        userId: faker.string.uuid(),
        name: faker.person.fullName(),
        email: faker.internet.email().toLocaleLowerCase(),
      }

      group = await Group.create({
        name: 'group',
        emoji: '🦊',
        administrator: groupAdministrator,
      })

      await prisma.group.create({
        data: {
          id: group._id.toString(),
          name: group.name,
          emoji: group.emoji,
          administrator: {
            create: {
              user: {
                create: {
                  id: groupAdministrator.userId,
                  name: groupAdministrator.name,
                  email: groupAdministrator.email,
                },
              },
            },
          },
        },
      })
    })

    afterEach(() => Group.deleteMany())

    describe('And finished simulation', () => {
      it(`Then it does send a group participation email`, async () => {
        const payload = {
          simulation: {
            id: faker.string.uuid(),
            progression: 1,
            date: new Date(),
            groups: [group._id.toString()],
          },
          email: faker.internet.email().toLocaleLowerCase(),
          name: faker.person.fullName(),
          userId: faker.string.uuid(),
        }

        const scope = nock(process.env.BREVO_URL!, {
          reqheaders: {
            'api-key': process.env.BREVO_API_KEY!,
          },
        })
          .post('/v3/contacts', {
            email: payload.email,
            attributes: {
              USER_ID: payload.userId,
              LAST_SIMULATION_DATE: isoStringRegex,
              ACTIONS_SELECTED_NUMBER: 0,
              LAST_SIMULATION_BILAN_FOOTPRINT: '0',
              LAST_SIMULATION_TRANSPORTS_FOOTPRINT: '0',
              LAST_SIMULATION_ALIMENTATION_FOOTPRINT: '0',
              LAST_SIMULATION_LOGEMENT_FOOTPRINT: '0',
              LAST_SIMULATION_DIVERS_FOOTPRINT: '0',
              LAST_SIMULATION_SERVICES_FOOTPRINT: '0',
              LAST_SIMULATION_BILAN_WATER: '0',
            },
            updateEnabled: true,
          })
          .reply(200)
          .post('/v3/contacts', {
            email: groupAdministrator.email,
            attributes: {
              NUMBER_CREATED_GROUPS_WITH_ONE_PARTICIPANT: 1,
              USER_ID: groupAdministrator.userId,
            },
            updateEnabled: true,
          })
          .reply(200)
          .post('/v3/contacts', {
            email: payload.email,
            listIds: [30],
            attributes: {
              PRENOM: payload.name,
              USER_ID: payload.userId,
            },
            updateEnabled: true,
          })
          .reply(200)
          .post('/v3/smtp/email', {
            to: [
              {
                name: payload.email,
                email: payload.email,
              },
            ],
            templateId: 58,
            params: {
              GROUP_URL: `https://nosgestesclimat.fr/amis/resultats?groupId=${group._id}&mtm_campaign=email-automatise&mtm_kwd=groupe-invite-voir-classement`,
              SHARE_URL: `https://nosgestesclimat.fr/amis/invitation?groupId=${group._id}&mtm_campaign=email-automatise&mtm_kwd=groupe-invite-url-partage`,
              DELETE_URL: `https://nosgestesclimat.fr/amis/supprimer?groupId=${group._id}&userId=${payload.userId}&mtm_campaign=email-automatise&mtm_kwd=groupe-invite-delete`,
              GROUP_NAME: group.name,
              NAME: payload.name,
            },
          })
          .reply(200)

        await agent.post(url).send(payload).expect(StatusCodes.OK)

        expect(scope.isDone()).toBeTruthy()
      })
    })

    describe('And unfinished simulation', () => {
      it(`Then it does not send a group participation email`, async () => {
        const payload = {
          simulation: {
            id: faker.string.uuid(),
            progression: 0.5,
            date: new Date(),
            groups: [group._id.toString()],
          },
          email: faker.internet.email().toLocaleLowerCase(),
          name: faker.person.fullName(),
          userId: faker.string.uuid(),
        }

        const scope = nock(process.env.BREVO_URL!, {
          reqheaders: {
            'api-key': process.env.BREVO_API_KEY!,
          },
        })
          .post('/v3/contacts', {
            email: payload.email,
            attributes: {
              USER_ID: payload.userId,
              LAST_SIMULATION_DATE: isoStringRegex,
              ACTIONS_SELECTED_NUMBER: 0,
              LAST_SIMULATION_BILAN_FOOTPRINT: '0',
              LAST_SIMULATION_TRANSPORTS_FOOTPRINT: '0',
              LAST_SIMULATION_ALIMENTATION_FOOTPRINT: '0',
              LAST_SIMULATION_LOGEMENT_FOOTPRINT: '0',
              LAST_SIMULATION_DIVERS_FOOTPRINT: '0',
              LAST_SIMULATION_SERVICES_FOOTPRINT: '0',
              LAST_SIMULATION_BILAN_WATER: '0',
            },
            updateEnabled: true,
          })
          .reply(200)
          .post('/v3/contacts', {
            email: groupAdministrator.email,
            attributes: {
              NUMBER_CREATED_GROUPS_WITH_ONE_PARTICIPANT: 1,
              USER_ID: groupAdministrator.userId,
            },
            updateEnabled: true,
          })
          .reply(200)

        await agent.post(url).send(payload).expect(StatusCodes.OK)

        expect(scope.isDone()).toBeTruthy()
      })
    })
  })
})
