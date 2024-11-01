import express from 'express'
import connectdb from '../../helpers/db/initDatabase'
import { Simulation } from '../../schemas/SimulationSchema'

const router = express.Router()

router.route('/:id?').get((req, res) => {
  console.log("SALUT l'observateur", req.params.id)
  if (req.params.id == null) {
    return res.status(404).send('You must provide a simulation id')
  }

  connectdb().then(() => {
    const data = Simulation.find({ id: req.params.id })
    data.then((simulations) => {
      if (!simulations.length) {
        return res.status(404).send('This simulation does not exist')
      }
      res.setHeader('Content-Type', 'application/json')
      res.statusCode = 200
      res.json(simulations)
    })
  })
})

// This POST route creates or updates a property. It's a backup API. One-way only.
router.route('/').post(async (req, res) => {
  if (req.body.id == null) {
    return res.status(422).send('You must provide a simulation id')
  }

  const found = await Simulation.find({ id: req.body.id })

  const simulation = found.length
    ? found[0]
    : new Simulation({ id: req.body.id })

  // @ts-expect-error 2339 no more data on simulation
  simulation.data = req.body.data

  simulation.save((error) => {
    if (error) {
      return res.send(error)
    }

    res.setHeader('Content-Type', 'application/json')
    res.statusCode = 200
    res.json(simulation)

    console.log('Simulation updated', req.body.id)
  })
})

export default router
