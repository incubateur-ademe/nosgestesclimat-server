import { initContract, ZodErrorSchema } from '@ts-rest/core'
import { StatusCodes } from 'http-status-codes'
import { Stream } from 'stream'
import { z } from 'zod'
import type { ValueOf } from '../../../../types/types'
import { ExternalServiceTypeEnum } from '../../integrations.validator'

export const MappingFileKind = {
  conversion: 'conversion',
  default: 'default',
  absent: 'absent',
  values: 'values',
} as const

export type MappingFileKind = ValueOf<typeof MappingFileKind>

const MappingFileCreateDto = z
  .object({
    kind: z.nativeEnum(MappingFileKind),
    partner: z.nativeEnum(ExternalServiceTypeEnum),
  })
  .strict()

export type MappingFileCreateDto = z.infer<typeof MappingFileCreateDto>

export const MappingFile = z
  .object({
    buffer: z.instanceof(Buffer),
    encoding: z.string(),
    fieldname: z.string(),
    mimetype: z.string().regex(/ya?ml/),
    originalname: z.string().regex(/\.ya?ml$/),
    size: z.number(),
    path: z.string().optional(),
    filename: z.string().optional(),
    destination: z.string().optional(),
    stream: z.instanceof(Stream).optional(),
  })
  .strict()

export type MappingFile = z.infer<typeof MappingFile>

const c = initContract()

const contract = c.router({
  uploadMappingFile: {
    method: 'PUT',
    path: '/integrations-api/v1/mapping-files',
    contentType: 'multipart/form-data',
    query: z.object({}).strict(),
    pathParams: z.object({}).strict(),
    body: MappingFileCreateDto,
    responses: {
      [StatusCodes.CREATED as number]: z.string(),
      [StatusCodes.BAD_REQUEST as number]: ZodErrorSchema,
      [StatusCodes.UNAUTHORIZED as number]: z.string(),
      [StatusCodes.FORBIDDEN as number]: z.string(),
      [StatusCodes.INTERNAL_SERVER_ERROR as number]: z.object({}).strict(),
    },
    summary: 'Uploads a configuration file for the situation mapping',
    metadata: {
      security: [
        {
          bearerAuth: [],
        },
      ],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['kind', 'partner', 'file'],
              properties: {
                kind: {
                  type: 'string',
                  enum: Object.values(MappingFileKind),
                },
                partner: {
                  type: 'string',
                  enum: Object.values(ExternalServiceTypeEnum),
                },
                file: {
                  type: 'string',
                  format: 'binary',
                },
              },
            },
          },
        },
      },
    },
  },
})

export default contract
