const db = require('./postgres')
const userModel = require('./models/user')
const tunnelModel = require('./models/tunnel')

module.exports = function setupDb() {
  return db
    .setup()
    .then(userModel.setup)
    .then(tunnelModel.setup)
    .then(() => console.log('Database and models setup'))
}
