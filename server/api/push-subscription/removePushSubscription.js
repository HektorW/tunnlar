const pushSubscriptionModel = require('../../db/models/push-subscription')

const log = (...args) => console.log('api/removePushSubscription', ...args)

module.exports = async function removePushSubscription(ctx) {
  const { subscription } = ctx.request.body

  log('trying to remove subscription', { subscription })

  await pushSubscriptionModel.removePushSubscription(subscription)

  ctx.body = { success: true }
}
