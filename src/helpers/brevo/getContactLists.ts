import axios from 'axios'
import { axiosConf } from '../../constants/axios'

export async function getContactLists(email: string) {
  try {
    const response = await axios.get(
      `/v3/contacts/${encodeURIComponent(email)}`,
      axiosConf
    )
    const contactData = response.data

    return contactData.listIds
  } catch (error) {
    console.warn(error)
    return []
  }
}
