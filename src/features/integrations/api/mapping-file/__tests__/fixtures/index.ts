import { ExternalServiceTypeEnum } from '../../../../integrations.validator'
import { MappingFileKind } from '../../mapping-file.contract'

const mappingFileKinds = Object.values(MappingFileKind)

export const randomMappingFileKind = (kinds = mappingFileKinds) =>
  kinds[Math.floor(Math.random() * kinds.length)]

const externalServices = Object.values(ExternalServiceTypeEnum)

export const randomPartner = (partners = externalServices) =>
  partners[Math.floor(Math.random() * partners.length)]
