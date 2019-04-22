require('dotenv').config()
const { getBool } = require('./parse')

const { env } = process

module.exports = {
  databaseSsl: getBool(env.DATABASE_SSL, false),
  databaseUrl: env.DATABASE_URL || null,
  port: env.PORT || 4002,
  vapidPublicKey: env.VAPID_PUBLIC_KEY,
  vapidPrivateKey: env.VAPID_PRIVATE_KEY,
  vapidSubject: env.VAPID_SUBJECT
}
