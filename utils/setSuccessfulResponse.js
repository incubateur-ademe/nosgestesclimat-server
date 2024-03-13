const setSuccessfulJSONResponse = (response) => {
  response.setHeader('Content-Type', 'application/json')
  response.statusCode = 200
}

module.exports = {
  setSuccessfulJSONResponse
}
