const jwt = require('jsonwebtoken')

function authenticateToken({ req, res, ownerEmail }) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (token == null) return res.sendStatus(401)

  jwt.verify(
    token,
    process.env.TOKEN_SECRET,
    (err, { ownerEmail: ownerEmailDecoded }) => {
      if (err || ownerEmail !== ownerEmailDecoded) return res.sendStatus(403)

      // Generate a new token
      const newToken = jwt.sign(ownerEmail, process.env.TOKEN_SECRET, {
        expiresIn: '1h',
      })

      return newToken
    }
  )
}

module.exports = authenticateToken
