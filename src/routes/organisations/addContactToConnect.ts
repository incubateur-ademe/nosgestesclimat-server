import express, { Request, Response } from 'express'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import axios from 'axios'
import { CONNECT_URL } from '../../constants/urls'
import { authentificationMiddleware } from '../../middlewares/authentificationMiddleware'

const router = express.Router()

router
  .use(authentificationMiddleware)
  .route('/')
  .post(async (req: Request, res: Response) => {
    try {
      const email = req.body.email
      const name = req.body.name
      const position = req.body.position

      if (!email || !name) {
        return res
          .status(403)
          .json('Error. An email address and a name must be provided.')
      }

      await axios.post(
        CONNECT_URL,
        {
          email,
          nom: name,
          fonction: position,
          source: 'Nos gestes Climat',
        },
        {
          headers: {
            client_id: process.env.CONNECT_CLIENT_ID,
            client_secret: process.env.CONNECT_CLIENT_SECRET,
          },
        }
      )

      setSuccessfulJSONResponse(res)

      res.json({ message: 'Contact added to Connect' })
    } catch (error) {
      console.log(error)
      return res.status(403).json(error)
    }
  })

export default router
