const { join } = require('path')
const Koa = require('koa')
const bodyParser = require('koa-bodyparser')
const koaHandlebars = require('koa-handlebars')
const koaEtag = require('koa-etag')
const serve = require('koa-static')
const config = require('../config')
const sendTunnelNotifications = require('./push-notifications/sendTunnelNotifications')
const { getUser, getAllUsers } = require('./db/models/user')
const { getAllTunnels, addTunnel } = require('./db/models/tunnel')
const { addPushSubscription } = require('./db/models/push-subscription')

const getUsersAndTunnels = async () => {
  const [users, tunnels] = await Promise.all([getAllUsers(), getAllTunnels()])
  return {
    tunnels,
    users: users.map(user => ({
      ...user,
      tunnelsBy: tunnels.filter(tunnel => tunnel.by === user.id).length,
      tunnelsAgainst: tunnels.filter(tunnel => tunnel.against === user.id)
        .length
    }))
  }
}

const app = new Koa()

app.use(async (ctx, next) => {
  console.log(`request: "${ctx.path}"`)
  await next()
  console.log(`reponse: ${ctx.status}`)
})

app.use(
  koaHandlebars({
    root: join(__dirname, '../client')
  })
)

app.use(bodyParser())

app.use(async (ctx, next) => {
  if (ctx.method === 'POST' && ctx.path === '/api/add-tunnel') {
    const { byId, againstId, tunnelItem, subscriptionId } = ctx.request.body

    const [byUser, againstUser] = await Promise.all([
      getUser(byId),
      getUser(againstId)
    ])

    if (!byUser || !againstUser) {
      ctx.status = 400
      ctx.body = 'Invalid ids'
      return
    }

    const tunnelId = await addTunnel(byId, againstId, tunnelItem)
    const { users, tunnels } = await getUsersAndTunnels()
    ctx.body = { tunnelId, users, tunnels }

    console.log('sending notifications')
    sendTunnelNotifications(
      byUser,
      againstUser,
      subscriptionId ? parseInt(subscriptionId, 10) : null
    ).then(() => console.log('sent tunnel notifications'))
  } else {
    return next()
  }
})

app.use(async (ctx, next) => {
  if (ctx.method === 'GET' && ctx.path === '/api/get-all') {
    ctx.body = await getUsersAndTunnels()
  } else {
    return next()
  }
})

app.use(async (ctx, next) => {
  if (ctx.method === 'POST' && ctx.path === '/api/subscribe') {
    const { subscription, userAgent } = ctx.request.body

    const subscriptionId = await addPushSubscription(subscription, userAgent)

    ctx.body = { subscriptionId }
  } else {
    return next()
  }
})

app.use(koaEtag())

app.use(async (ctx, next) => {
  if (ctx.method === 'GET' && ctx.path === '/') {
    const { users, tunnels } = await getUsersAndTunnels()

    await ctx.render('index', {
      users,
      tunnels,
      vapidPublicKey: config.vapidPublicKey
    })
  } else {
    return next()
  }
})

app.use(serve(join(__dirname, '../client')))

module.exports = app
