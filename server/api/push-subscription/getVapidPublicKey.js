const { vapidPublicKey } = require('../../../config')

module.exports = function getVapidPublicKey(ctx) {
  ctx.body = { vapidPublicKey }
}
