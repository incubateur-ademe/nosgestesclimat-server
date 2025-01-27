import { tsRestServer } from '../../../core/ts-rest'
import apiContract from './api.contract'
import authenticationRouter from './authentication/authentication.controller'
import emailWhitelistRouter from './email-whitelist/email-whitelist.controller'
import mappingFileRouter from './mapping-file/mapping-file.controller'
import mappingSituationRouter from './mapping-situation/mapping-situation.controller'

const router = tsRestServer.router(apiContract, {
  Authentication: authenticationRouter,
  EmailWhitelist: emailWhitelistRouter,
  MappingFile: mappingFileRouter,
  MappingSituation: mappingSituationRouter,
})

export default router
