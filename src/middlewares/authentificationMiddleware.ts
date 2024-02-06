import jwt, { JwtPayload, Secret } from 'jsonwebtoken'
import dotenv from 'dotenv'
import { NextFunction, Request, Response } from 'express'
dotenv.config()

type Props = {
  req: Request
  res: Response
  email: string
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

  jwt.verify(token, process.env.JWT_SECRET as Secret, (err, result) => {
    const emailDecoded = (result as JwtPayload)?.email

    if (err || email !== emailDecoded) {
      throw new Error('Invalid token')
    }

    // Generate a new token
    const newToken = jwt.sign({ email }, process.env.JWT_SECRET as Secret, {
      expiresIn: '1h',
    })

    res.cookie('ngcjwt', newToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      path: '/',
    })
  })

  next()
}
