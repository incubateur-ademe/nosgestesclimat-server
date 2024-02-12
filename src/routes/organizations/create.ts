import express, { Request, Response } from 'express'
import { Organization } from '../../schemas/OrganizationSchema'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { handleSendVerificationCodeAndReturnExpirationDate } from '../../helpers/verificationCode/handleSendVerificationCodeAndReturnExpirationDate'
import { Poll } from '../../schemas/PollSchema'

const router = express.Router()

router.route('/').post(async (req: Request, res: Response) => {
  try {
    const administratorEmail = req.body.administratorEmail

    if (!administratorEmail) {
      return res.status(403).json('Error. An email address must be provided.')
    }

    const pollCreated = new Poll({
      //TODO: it should be unique and not random
      simulations: [],
    })

    const newlySavedPoll = await pollCreated.save()

    const organizationCreated = new Organization({
      administrators: [
        {
          email: administratorEmail,
        },
      ],
      polls: [newlySavedPoll._id],
    })

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
