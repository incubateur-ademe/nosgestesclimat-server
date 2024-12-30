import { initContract } from '@ts-rest/core'
import authenticationContract from './authentication/authentication.contract'

const c = initContract()

const contract = c.router({
  Authentication: authenticationContract,
})

export default contract
