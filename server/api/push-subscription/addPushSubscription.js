const pushSubscriptionModel = require('../../db/models/push-subscription')

module.exports = async function addPushSubscription(ctx) {
  const { subscription, userAgent } = ctx.request.body

  const subscriptionId = await pushSubscriptionModel.addPushSubscription(
    subscription,
    userAgent
  )

  ctx.body = { success: true, subscriptionId }
}
