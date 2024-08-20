import type { Response } from 'express'

export const setSuccessfulJSONResponse = (response: Response) => {
  response.setHeader('Content-Type', 'application/json')
  response.statusCode = 200
}
