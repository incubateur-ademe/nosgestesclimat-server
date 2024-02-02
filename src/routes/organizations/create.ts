import express, { Request, Response } from 'express'
import { Organization } from '../../schemas/OrganizationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { handleSendVerificationCodeAndReturnExpirationDate } from '../../helpers/verificationCode/handleSendVerificationCodeAndReturnExpirationDate'
import { getUserDocument } from '../../helpers/queries/getUserDocument'

const router = express.Router()

router.route('/').post(async (req: Request, res: Response) => {
  try {
    const administratorEmail = req.body.administratorEmail
    const userId = req.body.userId

    if (!administratorEmail) {
      return res.status(403).json('Error. An email address must be provided.')
    }

    // Get user document or create a new one
    const userDocument = await getUserDocument({
      email: administratorEmail,
      name: undefined,
      userId,
    })

    if (!userDocument) {
      return res.status(403).json('Error while searching for user.')
    }

    const organizationCreated = new Organization({
      administrators: [
        {
          email: administratorEmail,
        },
      ],
      polls: [
        {
          simulations: [],
        },
      ],
    })

    // Add the organization to the user document
    userDocument?.organizations?.push(organizationCreated._id)

    await userDocument.save()

    // Save the organization
    const newlySavedOrganization = await organizationCreated.save()

    const verificationCodeObject =
      await handleSendVerificationCodeAndReturnExpirationDate(
        administratorEmail
      )

    newlySavedOrganization.administrators[0].verificationCode =
      verificationCodeObject

    await newlySavedOrganization.save()

    setSuccessfulJSONResponse(res)

    res.json({ expirationDate: verificationCodeObject.expirationDate })

    console.log('New organization created')
  } catch (error) {
    console.log(error)
    return res.status(403).json(error)
  }
})

export default router
