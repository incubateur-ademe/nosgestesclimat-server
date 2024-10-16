import type { Request, Response } from 'express'
import express from 'express'
import {
  COOKIE_NAME,
  COOKIES_OPTIONS,
} from '../../features/authentication/authentication.service'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'

const router = express.Router()

router
  .use(function (req, res, next) {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate')
    // -1 setting up request as expired and re-requesting before display again.
    res.header('Expires', '-1')

    res.clearCookie(COOKIE_NAME, COOKIES_OPTIONS)

    res.cookie(COOKIE_NAME, '', COOKIES_OPTIONS)

    next()
  })
  .route('/')
  .post((req: Request, res: Response) => {
    try {
      setSuccessfulJSONResponse(res)
      res.json('Logged out')
    } catch (error) {
      return res.status(403).json(error)
    }
  })

/**
 * @deprecated should use features/authentication instead
 */
export default router
