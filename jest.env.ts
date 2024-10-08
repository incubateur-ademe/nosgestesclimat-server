const MONGO_PORT = 27017 + parseInt(process.env.JEST_WORKER_ID || '0', 10)

process.env.MONGO_URL = `mongodb://127.0.0.1:${MONGO_PORT}/ngc`
process.env.BREVO_URL = 'https://api.brevo.com'
process.env.BREVO_API_KEY = 'mySuperTestBrevoSecret'
process.env.CONNECT_URL = 'http://connect.fr'
process.env.JWT_SECRET = 'mySuperTestSecret'
