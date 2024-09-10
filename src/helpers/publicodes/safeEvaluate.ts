import type { EvaluatedNode, PublicodesExpression } from 'publicodes'
import type Engine from 'publicodes'
import { carbonMetric } from '../../constants/ngc'
import type { Metric } from '../../types/types'

export function safeEvaluate({
  engine,
  expr,
  metric = carbonMetric,
}: {
  engine: Engine
  expr: PublicodesExpression
  metric: Metric
}) {
  const exprWithContext = {
    valeur: expr,
    contexte: {
      métrique: `'${metric}'`,
    },
  }

  let evaluation: EvaluatedNode

  try {
    evaluation = engine.evaluate(exprWithContext)
  } catch (error) {
    console.error(error)
    return null
  }

  return evaluation
}
