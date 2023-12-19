import axios from 'axios'

const axiosConf = {
  headers: {
    'api-key': process.env.BREVO_API_KEY,
  },
}

export async function sendVerificationCode({
  email,
  verificationCode,
  isSubscribedToNewsletter,
  organizationURL,
}) {
  // Add contact to list
  try {
    await axios.post(
      'https://api.brevo.com/v3/contacts',
      {
        email,
        listIds: ['27'],
        attributes: {
          OPT_IN: isSubscribedToNewsletter,
        },
      },
      axiosConf
    )
  } catch (error) {
    // Do nothing, the contact already exists
  }

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
        ORGANIZATION_URL: organizationURL,
      },
    },
    axiosConf
  )

  return new NextResponse('Email sent.', {
    status: 200,
  })
}
