const matchCalendar = require('../../../asp.malmokorpenfotboll/matchCalendar')

module.exports = async function matchCalendarHandler(ctx) {
  const { leagueId, teamName } = ctx.params

  ctx.body = await matchCalendar(leagueId, teamName)
}
