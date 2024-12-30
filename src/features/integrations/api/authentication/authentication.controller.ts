import { tsRestServer } from '../../../../core/ts-rest'
import authenticationContract from './authentication.contract'

const router = tsRestServer.router(authenticationContract, {})

export default router
