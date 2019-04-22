const webPush = require('web-push')
const config = require('../../config')
const { removePushSubscriptionById } = require('../db/models/push-subscription')

const log = (...args) => console.log('sendPushNotification', ...args)

webPush.setVapidDetails(
  config.vapidSubject,
  config.vapidPublicKey,
  config.vapidPrivateKey
)

module.exports = async function sendPushNotification(
  subscriptionModel,
  notificationData,
  options
) {
  const subscriptionId = subscriptionModel.id
  const subscriptionInfo = JSON.parse(subscriptionModel.subscriptionJson)
  try {
    const result = await webPush.sendNotification(
      subscriptionInfo,
      JSON.stringify(notificationData),
      options
    )

    log('successfully sent notification', { subscriptionId })

    return result
  } catch (error) {
    if (error.statusCode === 404 || error.statusCode === 410) {
      log('web-push returned known error code, removing subscription', {
        statusCode: error.statusCode,
        subscriptionId
      })
      await removePushSubscriptionById(subscriptionId)
    } else {
      log('web-push returnded unknown error code, keeping suscription', {
        error,
        subscriptionId
      })
    }

    throw error
  }
}
