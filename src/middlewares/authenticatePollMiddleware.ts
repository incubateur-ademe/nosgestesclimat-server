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
  const pollSlug = req.body.pollSlug

  try {
    const organisationFound = await Organisation.findOne({
      'administrators.email': email,
    }).populate('polls')

    // User is an administrator
    if (
      organisationFound &&
      organisationFound.polls.some((poll) => poll.slug === pollSlug)
    ) {
      next()
    }

    const userFound = await User.findOne({
      email,
    })
      .populate('organisations')
      .populate('polls')

    // User is a participant
    if (
      userFound &&
      (userFound.organisations as unknown as OrganisationType[])?.some(
        (organisation) =>
          organisation?.polls?.some((poll) => poll.slug === pollSlug)
      )
    ) {
      next()
    }

    throw Error('This user is not a participant or administrator of this poll.')
  } catch (error) {
    throw Error('No token provided.')
  }

  next()
}
