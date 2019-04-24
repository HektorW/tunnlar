const { join } = require('path')
const Koa = require('koa')
const bodyParser = require('koa-bodyparser')
const koaHandlebars = require('koa-handlebars')
const serve = require('koa-static')
const { getAllUsers, setTunnelCount } = require('./db/models/user')
const { getAllTunnels } = require('./db/models/tunnel')

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
  if (ctx.method === 'POST' && ctx.path === '/api/set-count') {
    const { userId, count } = ctx.request.body

    if (count < 0) {
      ctx.status = 400
      ctx.body = 'Invalid count'
      return
    }

    await setTunnelCount(userId, count)
    ctx.body = { success: true }
  } else {
    return next()
  }
})

app.use(async (ctx, next) => {
  if (ctx.method === 'GET' && ctx.path === '/api/get-all') {
    const allUsers = await getAllUsers()
    const allTunnels = await getAllTunnels()

    ctx.body = allUsers.map(user => ({
      ...user,
      tunnels: allTunnels.filter(tunnel => tunnel.by === user.id)
    }))
  } else {
    return next()
  }
})

app.use(async (ctx, next) => {
  if (ctx.method === 'GET' && ctx.path === '/') {
    const users = await getAllUsers()
    await ctx.render('index', {
      users
    })
  } else {
    return next()
  }
})

app.use(serve(join(__dirname, '../client')))

module.exports = app
