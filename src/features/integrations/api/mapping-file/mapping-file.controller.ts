import { tsRestServer } from '../../../../core/ts-rest'
import mappingFileContract from './mapping-file.contract'

const router = tsRestServer.router(mappingFileContract, {})

export default router
