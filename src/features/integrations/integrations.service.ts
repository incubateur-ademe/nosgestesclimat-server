import { exportSituation as agirExportSituation } from '../../adapters/agir/client'
import type { SituationSchema } from '../simulations/simulations.validator'

const externalServicesMap = {
  agir: {
    exportSituation: agirExportSituation,
  },
} as const

export const exportSituation = ({
  externalService,
  situation,
}: {
  situation: SituationSchema
  externalService: keyof typeof externalServicesMap
}) => {
  return externalServicesMap[externalService].exportSituation(situation)
}
