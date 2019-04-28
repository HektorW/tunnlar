const { getAllPushSubscriptions } = require('../db/models/push-subscription')
const sendPushNotification = require('./sendPushNotification')

const log = (...args) => console.log('sendTunnelNotifications', ...args)

module.exports = async function sendTunnelNotifications(
  by,
  against,
  bySubscriptionId
) {
  log('start')

  const title = `${by.name} har tunnlat ${against.name}`

  const messages = [
    'Den sved!',
    'Aj aj aj!',
    'Iiiiiisch',
    'En riktigt pinsam en',
    'Piiiiinsamt',
    'Lol',
    'LMAO',
    'Olé',
    `${against.name} behöver lära sig hålla igen`,
    `${against.name} får hålla ihop benen`,
    `${by.name} är en lurig en`
  ]

  const body = messages[Math.floor(Math.random() * messages.length)]

  const notificationData = {
    title,
    body
  }

  log('sending', notificationData)

  const pushSubscriptions = await getAllPushSubscriptions()

  return pushSubscriptions.map(subscription => {
    if (subscription.id === bySubscriptionId) return

    return sendPushNotification(subscription, notificationData)
  })
}
