import { initContract } from '@ts-rest/core'
import authenticationContract from './authentication/authentication.contract'
import emailWhitelistContract from './email-whitelist/email-whitelist.contract'

const c = initContract()

const contract = c.router({
  Authentication: authenticationContract,
  EmailWhitelist: emailWhitelistContract,
})

export default contract
