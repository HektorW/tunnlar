const { join } = require('path')
const Koa = require('koa')
const bodyParser = require('koa-bodyparser')
const koaHandlebars = require('koa-handlebars')
const serve = require('koa-static')
const { getAll, setTunnelCount } = require('./db/models/user')

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
    ctx.body = await getAll()
  } else {
    return next()
  }
})

app.use(async (ctx, next) => {
  if (ctx.method === 'GET' && ctx.path === '/') {
    const users = await getAll()
    await ctx.render('index', {
      users
    })
  } else {
    return next()
  }
})

app.use(serve(join(__dirname, '../client')))

module.exports = app
