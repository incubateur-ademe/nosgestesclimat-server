import type { RequestHandler } from 'express'
import { StatusCodes } from 'http-status-codes'
import multer from 'multer'
import yaml from 'yaml'
import { ZodError } from 'zod'
import { ForbiddenException } from '../../../../core/errors/ForbiddenException'
import { tsRestServer } from '../../../../core/ts-rest'
import logger from '../../../../logger'
import { generateAuthenticationMiddleware } from '../authentication/authentication.service'
import mappingFileContract, { MappingFile } from './mapping-file.contract'
import { uploadMappingFile } from './mapping-file.service'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 }, // 1 Mb
})

const validateMappingFile: RequestHandler = (req, res, next) => {
  try {
    yaml.parse(MappingFile.parse(req.file).buffer.toString())
    return next()
  } catch (err) {
    if (!(err instanceof ZodError)) {
      err = new ZodError(err)
    }

    return res.status(StatusCodes.BAD_REQUEST).send(err).end()
  }
}

const router = tsRestServer.router(mappingFileContract, {
  uploadMappingFile: {
    middleware: [
      generateAuthenticationMiddleware(),
      upload.single('file'),
      validateMappingFile,
    ],
    handler: async ({ file, body, req }) => {
      try {
        return {
          body: await uploadMappingFile({
            // @ts-expect-error could not type req.file correctly as MappingFile (see middleware above)
            file,
            fileCreateDto: body,
            userScopes: req.apiUser!.scopes,
          }),
          status: StatusCodes.CREATED,
        }
      } catch (err) {
        if (err instanceof ForbiddenException) {
          return {
            body: err.message,
            status: StatusCodes.FORBIDDEN,
          }
        }

        logger.error('Mapping File upload failed', err)
        return {
          body: {},
          status: StatusCodes.INTERNAL_SERVER_ERROR,
        }
      }
    },
  },
})

export default router
