import axios from 'axios'
import { config } from '../../config'

type Props = {
  email: string
  name: string
  position: string
}

export async function addOrUpdateContactToConnect({
  email,
  name,
  position,
}: Props) {
  await axios.post(
    config.connect.url,
    {
      email,
      nom: name,
      fonction: position,
      source: 'Nos gestes Climat',
    },
    {
      headers: {
        client_id: config.connect.clientId,
        client_secret: config.connect.clientSecret,
      },
    }
  )
}
