import jwt, { JwtPayload } from 'jsonwebtoken'
import dotenv from 'dotenv'
import { NextFunction, Request, Response } from 'express'
import { config } from '../config'
import { COOKIES_OPTIONS, COOKIE_MAX_AGE } from "../constants/cookies"

if (process.env.NODE_ENV === 'development') {
  dotenv.config()
}

export function authentificationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const email = req.body.email

  const cookiesHeader = req.headers.cookie

  const token =
    cookiesHeader && cookiesHeader.split('ngcjwt=')?.[1]?.split(';')?.[0]

  if (!token) {
    throw Error('No token provided.')
  }

  jwt.verify(token, config.security.jwt.secret, (err, result) => {
    const emailDecoded = (result as JwtPayload)?.email
    if (err || email !== emailDecoded) {
      throw new Error('Invalid token')
    }

    // Generate a new token
    const newToken = jwt.sign({ email }, config.security.jwt.secret, {
      expiresIn: COOKIE_MAX_AGE,
    })

    res.cookie('ngcjwt', newToken, COOKIES_OPTIONS)
  })

  next()
}
