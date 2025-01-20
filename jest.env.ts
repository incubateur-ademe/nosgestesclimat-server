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
process.env.TWO_TONS_URL = 'https://api.two-tons.com'
process.env.TWO_TONS_BEARER_TOKEN = 'mySuperTestTwoTonsSecret'
process.env.SCALEWAY_BUCKET = 'nosgestesclimat-test'
process.env.SCALEWAY_ROOT_PATH = 'ngc-test'
process.env.SCALEWAY_ENDPOINT = 'https://s3.fr-par.scw.cloud'
process.env.SCALEWAY_REGION = 'fr-par'
process.env.SCALEWAY_ROOT_PATH = 'ngc'
