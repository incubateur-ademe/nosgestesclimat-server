const MONGO_PORT = 27017 + parseInt(process.env.JEST_WORKER_ID || '0', 10)

process.env.MONGO_URL = `mongodb://127.0.0.1:${MONGO_PORT}/ngc`
process.env.AGIR_URL = 'https://api.agir.com'
process.env.AGIR_API_KEY = 'mySuperTestAgirSecret'
process.env.BREVO_URL = 'https://api.brevo.com'
process.env.BREVO_API_KEY = 'mySuperTestBrevoSecret'
process.env.CONNECT_URL = 'http://connect.fr'
process.env.CONNECT_CLIENT_ID = 'mySuperTestConnectClientId'
process.env.CONNECT_CLIENT_SECRET = 'mySuperTestConnectClientSecret'
process.env.JWT_SECRET = 'mySuperTestSecret'
