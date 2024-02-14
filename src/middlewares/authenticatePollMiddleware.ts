import dotenv from 'dotenv'
import { NextFunction, Request, Response } from 'express'
import { User } from '../schemas/UserSchema'
import { Organisation, OrganisationType } from '../schemas/OrganisationSchema'

dotenv.config()

export async function authenticatePollMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const email = req.body.email
  const orgaSlug = req.body.orgaSlug

  try {
    const organisationFound = await Organisation.findOne({
      'administrators.email': email,
    })

    // User is an administrator
    if (organisationFound && organisationFound.slug === orgaSlug) {
      return next()
    }

    const userFound = await User.findOne({
      email,
    }).populate('organisations')

    // User is a participant or a visitor
    if (
      userFound &&
      (userFound.organisations as unknown as OrganisationType[])?.some(
        (organisation) => organisation.slug === orgaSlug
      )
    ) {
      return next()
    }

    throw Error('This user is not a participant or administrator of this poll.')
  } catch (error) {
    res.status(500).send('Server error')
  }

  next()
}
