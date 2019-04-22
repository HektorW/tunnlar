const Router = require('koa-router')

const malmokorpenRoute = require('./malmokorpen')
const pushSubscriptionRoute = require('./push-subscription')
// const jobsRoute = require('./jobs')

const apiRouter = new Router()

apiRouter.use(
  '/api/malmokorpen',
  malmokorpenRoute.routes(),
  malmokorpenRoute.allowedMethods()
)

apiRouter.use(
  '/api/push-subscription',
  pushSubscriptionRoute.routes(),
  pushSubscriptionRoute.allowedMethods()
)

// apiRouter.use('/api/jobs', jobsRoute.routes(), jobsRoute.allowedMethods())

module.exports = apiRouter
