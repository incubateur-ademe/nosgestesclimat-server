import jwt, { JwtPayload, Secret } from 'jsonwebtoken'
import dotenv from 'dotenv'
import { Request, Response } from 'express'
import { config } from '../../config'

dotenv.config()

type Props = {
  req: Request
  res: Response
  email: string
}

export function authenticateToken({ req, res, email }: Props) {
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
      expiresIn: '1h',
    })

    res.cookie('ngcjwt', newToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'none',
    })
  })
}
