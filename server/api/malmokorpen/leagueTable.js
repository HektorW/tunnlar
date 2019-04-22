const fetchLeagueTable = require('../../malmokorpen/fetchLeagueTable')

module.exports = async function leagueTableHandler(ctx) {
  const { leagueId } = ctx.params

  ctx.body = await fetchLeagueTable(leagueId)
}
