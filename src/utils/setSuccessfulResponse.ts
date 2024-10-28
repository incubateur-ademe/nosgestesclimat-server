export const setSuccessfulJSONResponse = (response: any) => {
  response.setHeader('Content-Type', 'application/json')
  response.statusCode = 200
}
