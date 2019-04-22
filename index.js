const config = require('./config')
const server = require('./server')
require('./server/db/setup')()

const port = config.port

server.listen(port, () => {
  console.log(`listening on port ${port}`)
  console.log(config)
})
