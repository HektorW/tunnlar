const db = require('../index')
const createTable = require('./utils/createTable')
const { createModelCamelCaser } = require('./utils/camelCaseModel')

const tableName = (exports.tableName = 'push_subscription')

const tableColumnDefinitions = [
  'id SERIAL PRIMARY KEY',
  'subscriptionJson TEXT',
  'userAgent TEXT',
  'subscribeDate TIMESTAMP DEFAULT now()'
]

const { camelCaseModel, camelCaseAll } = createModelCamelCaser(
  tableColumnDefinitions
)

const subscriptionToJson = subscription => JSON.stringify(subscription)

const log = (...args) => console.log(tableName, ...args)

exports.setup = () =>
  createTable(db, tableName, tableColumnDefinitions).then(() =>
    log('model setup')
  )

exports.getSubscriptionBySubscriptionJson = subscriptionJson => {
  const query = `SELECT * FROM ${tableName} WHERE subscriptionJson = $1`
  const values = [subscriptionJson]

  return db.get(query, values).then(camelCaseModel)
}

exports.addPushSubscription = async (subscriptionData, userAgent = null) => {
  log('addPushSubscription', { userAgent })

  const subscriptionJson = subscriptionToJson(subscriptionData)
  const existingModel = await exports.getSubscriptionBySubscriptionJson(
    subscriptionJson
  )
  if (existingModel) {
    return existingModel.id
  }

  const insertColumns = ['subscriptionJson', 'userAgent']
  const insertValues = [subscriptionJson, userAgent]

  const modelId = await db.insert(tableName, insertColumns, insertValues)

  log('addPushSubscription - successfull', { userAgent, modelId })

  return modelId
}

exports.removePushSubscriptionById = async id => {
  log('removePushSubscriptionById', { id })

  const query = `DELETE FROM ${tableName} WHERE id = $1`
  const values = [id]

  return db.run(query, values)
}

exports.removePushSubscription = async subscriptionData => {
  const subscriptionJson = subscriptionToJson(subscriptionData)
  const subscriptionModel = await exports.getSubscriptionBySubscriptionJson(
    subscriptionJson
  )

  if (!subscriptionModel) {
    return
  }

  return exports.removePushSubscriptionById(subscriptionModel.id)
}

exports.getAllPushSubscriptions = async () => {
  const query = `SELECT * from ${tableName}`
  return db.all(query).then(camelCaseAll)
}
