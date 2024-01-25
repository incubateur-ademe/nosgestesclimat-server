const axios = require('axios')

async function updateBrevoContact({
  email,
  hasOptedInForCommunications,
  name,
}) {
  const axiosConf = {
    headers: {
      'api-key': process.env.BREVO_API_KEY,
    },
  }

  // Update contact
  try {
    await axios.put(
      `https://api.brevo.com/v3/contacts/${encodeURI(email)}`,
      {
        attributes: {
          OPT_IN: hasOptedInForCommunications,
          PRENOM: name,
        },
      },
      axiosConf
    )
  } catch (error) {
    throw new Error(error)
  }
}

module.exports = updateBrevoContact
