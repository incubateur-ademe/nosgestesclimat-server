import { exportSituation as twoTonsExportSituation } from '../../adapters/2tonnes/client'
import { exportSituation as agirExportSituation } from '../../adapters/agir/client'
import type { SituationSchema } from '../simulations/simulations.validator'
import type { SituationExportQueryParamsSchema } from './integrations.validator'

const externalServicesMap = {
  agir: {
    exportSituation: agirExportSituation,
  },
  '2-tonnes': {
    exportSituation: twoTonsExportSituation,
  },
} as const

const PARTNER_PREFIX = /^partner-/

const removePartnerPrefix = (
  params: SituationExportQueryParamsSchema
): SituationExportQueryParamsSchema =>
  Object.fromEntries(
    Object.entries(params).map(([key, val]) => [
      key.replace(PARTNER_PREFIX, ''),
      val,
    ])
  )

export const exportSituation = ({
  externalService,
  situation,
  params,
}: {
  situation: SituationSchema
  externalService: keyof typeof externalServicesMap
  params: SituationExportQueryParamsSchema
}) => {
  return externalServicesMap[externalService].exportSituation(
    situation,
    removePartnerPrefix(params)
  )
}
