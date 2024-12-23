import express from 'express'
import { Simulation } from '../../schemas/SimulationSchema'
import connectdb from '../../utils/initDatabase'

const router = express.Router()

router.route('/').get((req, res) => {
  connectdb().then(() => {
    const data = Simulation.find({})
    data.then((simulations) => {
      if (!simulations.length) {
        return res.status(404).send('No ratings found')
      }
      const ratings = simulations
        // @ts-expect-error 2339 no more data on simulation
        .map(({ data, updatedAt, createdAt }) => ({
          ratings: data?.ratings,
          createdAt,
          updatedAt,
        }))
        .filter((d) => d.ratings)
      res.setHeader('Content-Type', 'application/json')
      res.statusCode = 200
      res.json(ratings)
    })
  })
})

export default router
