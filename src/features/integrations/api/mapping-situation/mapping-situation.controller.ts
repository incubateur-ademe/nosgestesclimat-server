import { tsRestServer } from '../../../../core/ts-rest'
import mappingSituationContract from './mapping-situation.contract'

const router = tsRestServer.router(mappingSituationContract, {})

export default router
