import { ExternalServiceTypeEnum } from '../../../../integrations.validator'
import { MappingFileKind } from '../../mapping-file.contract'

export const CREATE_MAPPING_FILE_ROUTE = `/integrations-api/v1/mapping-files`

export const DELETE_MAPPING_FILE_ROUTE = `/integrations-api/v1/mapping-files/:partner/:kind`

const mappingFileKinds = Object.values(MappingFileKind)

export const randomMappingFileKind = (kinds = mappingFileKinds) =>
  kinds[Math.floor(Math.random() * kinds.length)]

const externalServices = Object.values(ExternalServiceTypeEnum)

export const randomPartner = (partners = externalServices) =>
  partners[Math.floor(Math.random() * partners.length)]
