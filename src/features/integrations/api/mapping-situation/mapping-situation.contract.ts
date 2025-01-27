import { initContract, ZodErrorSchema } from '@ts-rest/core'
import { StatusCodes } from 'http-status-codes'
import { z } from 'zod'
import { SituationSchema } from '../../../simulations/simulations.validator'
import { ExternalServiceTypeEnum } from '../../integrations.validator'

const MappingSituationParams = z
  .object({
    partner: z.nativeEnum(ExternalServiceTypeEnum),
  })
  .strict()

export type MappingSituationParams = z.infer<typeof MappingSituationParams>

const MappingSituationDto = z
  .object({
    situation: SituationSchema,
  })
  .strict()

const c = initContract()

export type MappingSituationDto = z.infer<typeof MappingSituationDto>

const contract = c.router({
  mapSituation: {
    method: 'PUT',
    path: '/integrations-api/v1/mapping-situation/:partner',
    query: z.object({}).strict(),
    pathParams: MappingSituationParams,
    body: MappingSituationDto,
    responses: {
      [StatusCodes.OK as number]: z.unknown(),
      [StatusCodes.BAD_REQUEST as number]: ZodErrorSchema,
      [StatusCodes.INTERNAL_SERVER_ERROR as number]: z.object({}).strict(),
    },
    summary: 'Maps a ngc situation following partner configuration',
  },
})

export default contract
