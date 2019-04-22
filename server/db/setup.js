const db = require('./postgres')
const userModel = require('./models/user')

module.exports = function setupDb() {
  return db
    .setup()
    .then(userModel.setup)
    .then(() => console.log('Database and models setup'))
}
