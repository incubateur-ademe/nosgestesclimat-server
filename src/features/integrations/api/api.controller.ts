import { tsRestServer } from '../../../core/ts-rest'
import apiContract from './api.contract'
import authenticationRouter from './authentication/authentication.controller'

const router = tsRestServer.router(apiContract, {
  Authentication: authenticationRouter,
})

export default router
