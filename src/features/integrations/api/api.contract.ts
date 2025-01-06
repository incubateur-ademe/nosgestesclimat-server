import { initContract } from '@ts-rest/core'
import authenticationContract from './authentication/authentication.contract'
import emailWhitelistContract from './email-whitelist/email-whitelist.contract'
import mappingFileContract from './mapping-file/mapping-file.contract'

const c = initContract()

const contract = c.router({
  Authentication: authenticationContract,
  EmailWhitelist: emailWhitelistContract,
  MappingFile: mappingFileContract,
})

export default contract
