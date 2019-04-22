const Router = require('koa-router')
const sendMatchNotifications = require('../../scheduled-jobs/sendMatchNotifications')

const jobsRoutes = new Router()

jobsRoutes.get('/match-notifications', async ctx => {
  console.log('running job for match notifications')
  await sendMatchNotifications()
  ctx.body = 'Done'
})

module.exports = jobsRoutes
