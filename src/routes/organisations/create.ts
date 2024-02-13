import express, { Request, Response } from 'express'
import { Organisation } from '../../schemas/OrganisationSchema'
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

    const organisationCreated = new Organisation({
      administrators: [
        {
          email: administratorEmail,
        },
      ],
      polls: [newlySavedPoll._id],
    })

    // Save the organisation
    const newlySavedOrganisation = await organisationCreated.save()

    const verificationCodeObject =
      await handleSendVerificationCodeAndReturnExpirationDate(
        administratorEmail
      )

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
