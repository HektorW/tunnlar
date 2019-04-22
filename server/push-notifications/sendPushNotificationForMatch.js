const { addNotification } = require('../db/models/match-notification')
const sendPushNotification = require('./sendPushNotification')

const log = (...args) => console.log('sendPushNotificationForMatch', ...args)

module.exports = async function sendPushNotificationForMatch(
  subscriptionModel,
  match
) {
  const [teamA, teamB] = match.teams

  const notificationData = {
    date: match.activity.startTime,
    teamA: {
      id: teamA.id,
      name: teamA.name,
      score: match.result[0].result
    },
    teamB: {
      id: teamB.id,
      name: teamB.name,
      score: match.result[1].result
    }
  }

  const subscriptionId = subscriptionModel.id
  const matchId = match.id

  let sendResult
  try {
    sendResult = await sendPushNotification(subscriptionModel, notificationData)
  } catch (error) {
    log('failed to send match notification', { subscriptionId })
    return
  }

  if (sendResult.statusCode < 200 && sendResult.statusCode >= 300) {
    log('received unknown status code from web-push', {
      subscriptionId,
      matchId,
      statusCode: sendResult.statusCode,
      sendResult
    })
  }

  log('adding notification entry in DB', { subscriptionId, matchId })
  addNotification(subscriptionId, matchId)
}
