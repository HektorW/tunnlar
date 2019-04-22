const moment = require('moment-timezone')
const { getAllActiveLeagues } = require('../db/models/league')
const { getAllPushSubscriptions } = require('../db/models/push-subscription')
const {
  getNotificationsForSubscription
} = require('../db/models/match-notification')
const fetchMatchesForTeam = require('../malmokorpen/fetchMatchesForTeam')
const sendPushNotificationForMatch = require('../push-notifications/sendPushNotificationForMatch')
const { isLessThanXDaysAgo } = require('../../common/utils/date')

const log = (...args) =>
  console.log('scheduled-jobs.sendMatchNotifications', ...args)

module.exports = async function sendMatchNotifications() {
  log('start')

  const activeLeagues = await getAllActiveLeagues()

  log({ activeLeagues })

  if (activeLeagues.length === 0) {
    return
  }

  activeLeagues.forEach(async league => {
    const teamMatches = await fetchMatchesForTeam(league.id, league.mainTeamId)

    log('fetched matches', { count: teamMatches.length })

    const finishedLatestMatches = teamMatches
      .filter(match => match.result !== null)
      .filter(match =>
        isLessThanXDaysAgo(
          1,
          moment.tz(match.activity.startTime, 'Europe/Stockholm').toDate()
        )
      )

    if (finishedLatestMatches.length === 0) {
      log('no recently finished matches')
      return
    }

    log('filter matches', {
      finishedLatestMatches: finishedLatestMatches.length
    })

    const pushSubscriptions = await getAllPushSubscriptions()

    log('fetched subscriptions', {
      pushSubscriptions: pushSubscriptions.length
    })

    pushSubscriptions.forEach(async subscription => {
      const sentNotifications = await getNotificationsForSubscription(
        subscription.id
      )

      log('fetched sent notifications for subscription', {
        subscription: subscription.id,
        notificationsSent: sentNotifications.length
      })

      const matchesNotSentFor = finishedLatestMatches.filter(
        match =>
          !sentNotifications.find(
            notification => notification.matchId === match.id
          )
      )

      if (matchesNotSentFor.length === 0) {
        log('already sent notifications for all matches for', {
          subscription: subscription.id
        })
        return
      }

      log('found matches to send notification for', {
        subscription: subscription.id,
        matches: matchesNotSentFor.length
      })

      matchesNotSentFor.forEach(match => {
        log('Sending notification for', subscription.id, 'for match', match.id)

        sendPushNotificationForMatch(subscription, match)
      })
    })
  })
}

if (require.main === module) {
  require('../db/setup')().then(() => module.exports())
}
