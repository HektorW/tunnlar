const db = require('./postgres')
const pushSubscriptionModel = require('./models/push-subscription')
const userModel = require('./models/user')
const tunnelModel = require('./models/tunnel')

module.exports = function setupDb() {
  return db
    .setup()
    .then(userModel.setup)
    .then(tunnelModel.setup)
    .then(pushSubscriptionModel.setup)
    .then(() => console.log('Database and models setup'))
}
