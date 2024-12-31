import path from 'path'
import fs from 'fs'
import { format, resolveConfig } from 'prettier'
import type {
  Personas,
  Persona,
  NodeValue,
} from '@incubateur-ademe/nosgestesclimat'
import personas from '@incubateur-ademe/nosgestesclimat/public/personas-fr.json'
import convertTo2Tonnes from './convertTo2Tonnes'

type PersonaWithSurveyVariables = Persona & {
  surveyVariables?: Record<string, NodeValue>
}

Object.values(personas as Personas).map(
  (persona: PersonaWithSurveyVariables) => {
    persona['surveyVariables'] = convertTo2Tonnes(persona.situation)
  }
)

resolveConfig(process.cwd()).then((prettierConfig) => {
  format(JSON.stringify(personas), {
    ...prettierConfig,
    parser: 'json',
  }).then((formattedContent) => {
    fs.writeFileSync(
      path.join(
        process.cwd(),
        'scripts/convertSituation/2Tonnes/personas.json'
      ),
      formattedContent
    )
  })
})

console.log('✅ Les personas ont été convertis avec succès !')
