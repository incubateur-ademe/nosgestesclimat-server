import dotenv from 'dotenv'
import { NextFunction, Request, Response } from 'express'
import { User } from '../schemas/UserSchema'
import { Organization, OrganizationType } from '../schemas/OrganizationSchema'

dotenv.config()

export async function authenticatePollMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const email = req.body.email
  const pollSlug = req.body.pollSlug

  try {
    const organizationFound = await Organization.findOne({
      'administrators.email': email,
    }).populate('polls')

    // User is an administrator
    if (
      organizationFound &&
      organizationFound.polls.some((poll) => poll.slug === pollSlug)
    ) {
      next()
    }

    const userFound = await User.findOne({
      email,
    })
      .populate('organizations')
      .populate('polls')

    // User is a participant
    if (
      userFound &&
      (userFound.organizations as unknown as OrganizationType[])?.some(
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
