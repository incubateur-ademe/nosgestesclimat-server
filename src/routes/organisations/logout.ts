import express, { Request, Response } from 'express'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { COOKIES_OPTIONS } from '../../constants/cookies'

const router = express.Router()

router
  .use(function (req, res, next) {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate')
    // -1 setting up request as expired and re-requesting before display again.
    res.header('Expires', '-1')

    res.clearCookie('ngcjwt', COOKIES_OPTIONS)

    res.cookie('ngcjwt', '', COOKIES_OPTIONS)

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

export default router
