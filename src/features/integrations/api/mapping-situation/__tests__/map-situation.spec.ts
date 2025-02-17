import { GetObjectCommand, NotFound } from '@aws-sdk/client-s3'
import { faker } from '@faker-js/faker'
import { readFile } from 'fs/promises'
import { StatusCodes } from 'http-status-codes'
import path from 'path'
import supertest from 'supertest'
import { client } from '../../../../../adapters/scaleway/client'
import app from '../../../../../app'
import {
  MAPPING_CASES,
  MAPPING_CASES_FUNC,
} from '../../../../../constants/change-case'
import logger from '../../../../../logger'
import { getRandomPersonaSituation } from '../../../../simulations/__tests__/fixtures/simulations.fixtures'
import type { SituationSchema } from '../../../../simulations/simulations.validator'
import { ExternalServiceTypeEnum } from '../../../integrations.validator'
import { randomPartner } from '../../mapping-file/__tests__/fixtures'
import type { MappingFileKind } from '../../mapping-file/mapping-file.contract'

const mockS3Files = (
  filesContent: Partial<
    Record<MappingFileKind, Buffer | string | undefined>
  > = {}
) => {
  jest.spyOn(client, 'send').mockImplementation((command) => {
    if (!(command instanceof GetObjectCommand)) {
      throw command
    }

    const kind = command.input.Key?.split('/').pop()?.replace('.yml', '') as
      | MappingFileKind
      | undefined

    if (kind && filesContent[kind]) {
      return Promise.resolve({
        Body: {
          transformToString() {
            return filesContent[kind]?.toString()
          },
        },
      })
    }

    return Promise.reject(
      new NotFound({
        message: 'NotFound: UnknownError',
        $metadata: {
          httpStatusCode: StatusCodes.NOT_FOUND,
        },
      })
    )
  })
}

describe('Given a NGC integrations API user', () => {
  const agent = supertest(app)
  const url = `/integrations-api/v1/mapping-situation/:partner`

  describe('When mapping a ngc situation', () => {
    let partner: ExternalServiceTypeEnum
    let situation: SituationSchema

    describe('And an invalid partner', () => {
      test(`Then it return a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent.put(url).expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And an invalid situation', () => {
      test(`Then it return a ${StatusCodes.BAD_REQUEST} error`, async () => {
        await agent
          .put(url.replace(':partner', randomPartner()))
          .expect(StatusCodes.BAD_REQUEST)
      })
    })

    describe('And files do not exist for partner', () => {
      beforeEach(() => mockS3Files())

      afterEach(() => {
        jest.spyOn(client, 'send').mockRestore()
      })

      test(`Then it return a ${StatusCodes.OK} response with empty object`, async () => {
        partner = randomPartner()
        situation = getRandomPersonaSituation()

        const { body } = await agent
          .put(url.replace(':partner', partner))
          .send({ situation })
          .expect(StatusCodes.OK)

        expect(body).toEqual({})
      })
    })

    describe('And rules & default files exist for partner', () => {
      beforeEach(() =>
        mockS3Files({
          conversion: `myRule: "'default'"`,
          default: `myRule: 1`,
        })
      )

      afterEach(() => {
        jest.spyOn(client, 'send').mockRestore()
      })

      test(`Then it return a ${StatusCodes.OK} response with mapped object`, async () => {
        partner = randomPartner()
        situation = getRandomPersonaSituation()

        const { body } = await agent
          .put(url.replace(':partner', partner))
          .send({ situation })
          .expect(StatusCodes.OK)

        expect(body).toEqual({
          myRule: 1,
        })
      })

      describe(`And a special mapping case`, () => {
        test(`Then it return a ${StatusCodes.OK} response with mapped object`, async () => {
          const mappingCase = faker.helpers.enumValue(MAPPING_CASES)
          partner = randomPartner()
          situation = getRandomPersonaSituation()

          const { body } = await agent
            .put(url.replace(':partner', partner))
            .query({ mappingCase })
            .send({ situation })
            .expect(StatusCodes.OK)

          expect(body).toEqual(
            MAPPING_CASES_FUNC[mappingCase]({
              myRule: 1,
            })
          )
        })
      })
    })

    describe(`And ${ExternalServiceTypeEnum['2-tonnes']} config`, () => {
      const basePath = path.join(
        __dirname,
        'fixtures',
        ExternalServiceTypeEnum['2-tonnes']
      )

      beforeEach(async () =>
        mockS3Files({
          conversion: await readFile(path.join(basePath, 'conversion.yml')),
          default: await readFile(path.join(basePath, 'default.yml')),
          absent: await readFile(path.join(basePath, 'absent.yml')),
          values: await readFile(path.join(basePath, 'values.yml')),
        })
      )

      afterEach(() => {
        jest.spyOn(client, 'send').mockRestore()
      })

      test(`Then it return a ${StatusCodes.OK} response with mapped object`, async () => {
        partner = randomPartner()
        situation = getRandomPersonaSituation()

        const { body } = await agent
          .put(url.replace(':partner', partner))
          .send({ situation })
          .expect(StatusCodes.OK)

        expect(body).toEqual(expect.any(Object))
      })
    })

    describe('And bucket failure', () => {
      const bucketError = new Error('Something went wrong')

      beforeEach(() => {
        jest
          .spyOn(client, 'send')
          .mockReset()
          .mockImplementationOnce(() => Promise.reject(bucketError))
      })

      test(`Then it returns a ${StatusCodes.INTERNAL_SERVER_ERROR} error`, async () => {
        await agent
          .put(url.replace(':partner', randomPartner()))
          .send({ situation: getRandomPersonaSituation() })
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)
      })

      test(`Then it logs the exception`, async () => {
        await agent
          .put(url.replace(':partner', randomPartner()))
          .send({ situation: getRandomPersonaSituation() })
          .expect(StatusCodes.INTERNAL_SERVER_ERROR)

        expect(logger.error).toHaveBeenCalledWith(
          'Mapping Situation failed',
          bucketError
        )
      })
    })
  })
})
