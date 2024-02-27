import express from 'express'
import { setSuccessfulJSONResponse } from '../../utils/setSuccessfulResponse'
import { QuizAnswer } from '../../schemas/QuizSchema'

const router = express.Router()

/**
 * Create a new quiz answer
 * It requires a simulationId, an answer, and isAnswerCorrect (can be 'correct', 'almost' or 'wrong')
 * It returns the created group
 */
router.route('/').post(async (req, res) => {
  const simulationId = req.body.simulationId
  const answer = req.body.answer
  const isAnswerCorrect: 'correct' | 'almost' | 'wrong' = req.body.isAnswerCorrect
 
  // If no simulationId, answer or isAnswerCorrect is provided, we return an error
  if (!simulationId) {
    return res.status(500).send('Error. A simulationId must be provided.')
  }
  if (!answer) {
    return res.status(500).send('Error. An answer must be provided.')
  }
  if (!isAnswerCorrect) {
    return res.status(500).send('Error. isAnswerCorrect must be provided.')
  }

  try {
    // We create and save a new quiz answer
    const quizAnswer = new QuizAnswer({
      answer: answer,
      isAnswerCorrect: isAnswerCorrect,
      simulationId: simulationId,
    })
    
    await quizAnswer.save()

    setSuccessfulJSONResponse(res)

    res.json(quizAnswer)

    console.log(`Quiz answer created: ${quizAnswer._id}`)
  } catch (error) {
    return res.status(500).send('Error while creating quiz answer.')
  }
})

export default router
