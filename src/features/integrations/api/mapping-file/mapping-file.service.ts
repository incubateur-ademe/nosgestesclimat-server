import { ObjectCannedACL, PutObjectCommand } from '@aws-sdk/client-s3'
import { ApiScopeName } from '@prisma/client'
import { client } from '../../../../adapters/scaleway/client'
import { config } from '../../../../config'
import { ForbiddenException } from '../../../../core/errors/ForbiddenException'
import { ExternalServiceTypeEnum } from '../../integrations.validator'
import type { MappingFile, MappingFileCreateDto } from './mapping-file.contract'

const MAPPING_FILES_ROOT_PATH = 'mapping-files'

const MAPPING_FILES_EXTENSION = 'yml'

export const SCOPES_FOR_PARTNERS: Record<
  ExternalServiceTypeEnum,
  ApiScopeName[]
> = {
  [ExternalServiceTypeEnum.agir]: [ApiScopeName.agir, ApiScopeName.ngc],
  [ExternalServiceTypeEnum['2-tonnes']]: [
    ApiScopeName.two_tons,
    ApiScopeName.ngc,
  ],
}

export const uploadMappingFile = async ({
  file: { buffer },
  fileCreateDto: { kind, partner },
  userScopes,
}: {
  file: MappingFile
  fileCreateDto: MappingFileCreateDto
  userScopes: Set<string>
}) => {
  if (!SCOPES_FOR_PARTNERS[partner].some((scope) => userScopes.has(scope))) {
    throw new ForbiddenException(`Forbidden ! Upload file for ${partner}`)
  }

  const filePath = `${partner}/${kind}.${MAPPING_FILES_EXTENSION}`

  await client.send(
    new PutObjectCommand({
      Bucket: config.thirdParty.scaleway.bucket,
      Key: `${config.thirdParty.scaleway.rootPath}/${MAPPING_FILES_ROOT_PATH}/${filePath}`,
      Body: buffer,
      ACL: ObjectCannedACL.private,
    })
  )

  return `File ${filePath} uploaded successfully`
}
