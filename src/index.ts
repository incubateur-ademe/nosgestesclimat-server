import { Server as HttpServer } from 'http'
import type { AddressInfo } from 'net'
import app from './app'
import { config } from './config'
import { initGeolocationStore } from './features/modele/geolocation.repository'

const main = async () => {
  await initGeolocationStore()

  const server = new HttpServer(app)

  server.listen(config.app.port, () => {
    const { address: host, port } = server.address() as AddressInfo
    console.log('App listening at http://%s:%s', host, port)
  })
}

main()
