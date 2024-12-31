import { tsRestServer } from '../../../../core/ts-rest'
import emailWhitelistContract from './email-whitelist.contract'

const router = tsRestServer.router(emailWhitelistContract, {})

export default router
