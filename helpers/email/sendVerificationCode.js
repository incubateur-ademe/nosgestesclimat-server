const axios = require('axios')

async function sendVerificationCode({ email, verificationCode }) {
  const axiosConf = {
    headers: {
      'api-key': process.env.BREVO_API_KEY,
    },
  }

  // Add contact to list
  try {
    await axios.post(
      'https://api.brevo.com/v3/contacts',
      {
        email,
        listIds: [27],
        attributes: {
          OPT_IN: false,
        },
      },
      axiosConf
    )
  } catch (error) {
    // Do nothing, the contact already exists
  }
  try {
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        to: [
          {
            name: email,
            email,
          },
        ],
        templateId: 66,
        params: {
          VERIFICATION_CODE: verificationCode,
        },
      },
      axiosConf
    )
  } catch (error) {
    console.log(error)
  }
}

module.exports = sendVerificationCode
