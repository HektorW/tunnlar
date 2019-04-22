const Router = require('koa-router')

const malmokorpenRoutes = new Router()

malmokorpenRoutes.get('/leaguetable/:leagueId', require('./leagueTable'))
malmokorpenRoutes.get(
  '/matchcalendar/:leagueId/:teamId',
  require('./matchCalendar')
)

module.exports = malmokorpenRoutes
