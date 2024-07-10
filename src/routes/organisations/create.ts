import express, { Request, Response } from 'express'
import { Organisation } from '../../schemas/OrganisationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { handleSendVerificationCodeAndReturnExpirationDate } from '../../helpers/verificationCode/handleSendVerificationCodeAndReturnExpirationDate'
import { Poll } from '../../schemas/PollSchema'

const router = express.Router()

router.route('/').post(async (req: Request, res: Response) => {
  try {
    const email = req.body.email?.toLowerCase()
    const userId = req.body.userId

    if (!email) {
      return res.status(403).json('Error. An email address must be provided.')
    }

    const organisationCreated = new Organisation({
      administrators: [
        {
          email,
          userId,
        },
      ],
      polls: [],
    })

    // Save the organisation
    const newlySavedOrganisation = await organisationCreated.save()

    const verificationCodeObject =
      await handleSendVerificationCodeAndReturnExpirationDate({ email, userId })

    newlySavedOrganisation.administrators[0].verificationCode =
      verificationCodeObject

    await newlySavedOrganisation.save()

    setSuccessfulJSONResponse(res)

    res.json({ expirationDate: verificationCodeObject.expirationDate })

    console.log('New organisation created')
  } catch (error) {
    console.log(error)
    return res.status(403).json(error)
  }
})

export default router
