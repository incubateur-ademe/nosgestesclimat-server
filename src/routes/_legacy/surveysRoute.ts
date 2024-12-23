import express from 'express'
import { prisma } from '../../adapters/prisma/client'
import logger from '../../logger'
import Survey from '../../schemas/_legacy/SurveySchema'
import connectdb from '../../utils/initDatabase'

const router = express.Router()

router.route('/:room').get((req, res) => {
  if (req.params.room == null) {
    throw new Error('Unauthorized. A valid survey name must be provided')
  }

  connectdb().then(() => {
    const data = Survey.find({ name: req.params.room })
    data.then((survey) => {
      res.setHeader('Content-Type', 'application/json')
      res.statusCode = 200
      res.json(survey)
    })
  })
})

router.route('/').post(async (req, res, next) => {
  const name = req.body.room

  if (name == null) {
    return next('Error. A survey name must be provided')
  }

  const found = await Survey.find({ name })
  if (found.length) {
    res.setHeader('Content-Type', 'application/json')
    res.statusCode = 409
    res.json(found[0])

    console.log('Survey exists', name)
    return
  }

  try {
    const survey = new Survey({ name })
    await survey.save()

    await prisma.survey
      .upsert({
        where: {
          name,
        },
        create: {
          id: survey._id.toString(),
          name,
        },
        update: {
          name,
        },
      })
      .catch((error) =>
        logger.error('postgre Surveys replication failed', error)
      )

    res.setHeader('Content-Type', 'application/json')
    res.statusCode = 200
    res.json(survey)

    console.log('New survey create', name)
  } catch (error) {
    return res.status(500).send(error).end()
  }
})

export default router
