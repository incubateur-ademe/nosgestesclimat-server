const jwt = require('jsonwebtoken')

require('dotenv').config()

function authenticateToken({ req, res, ownerEmail }) {
  const cookiesHeader = req.headers.cookie

  const token =
    cookiesHeader && cookiesHeader.split('ngcjwt=')?.[1].split(';')?.[0]

  if (!token) return res.sendStatus(401)

  jwt.verify(token, process.env.JWT_SECRET, (err, result) => {
    const ownerEmailDecoded = result?.ownerEmail

    if (err || ownerEmail !== ownerEmailDecoded) {
      throw new Error('Invalid token')
    }

    // Generate a new token
    const newToken = jwt.sign({ ownerEmail }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    })

    res.cookie('ngcjwt', newToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
    })
  })
}

module.exports = authenticateToken
