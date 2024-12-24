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

export const exportSituation = ({
  externalService,
  situation,
  params,
}: {
  situation: SituationSchema
  externalService: keyof typeof externalServicesMap
  params: SituationExportQueryParamsSchema
}) => {
  return externalServicesMap[externalService].exportSituation(situation, params)
}
