const db = require('../index')
const createTable = require('./utils/createTable')
const { createModelCamelCaser } = require('./utils/camelCaseModel')

const tableName = (exports.tableName = 'tunnlare')

const tableColumnDefinitions = [
  'id SERIAL PRIMARY KEY',
  'name TEXT',
  'tunnelCount INTEGER'
]

const { camelCaseModel, camelCaseAll } = createModelCamelCaser(
  tableColumnDefinitions
)

exports.setup = () => createTable(db, tableName, tableColumnDefinitions)

exports.getAll = () => {
  const query = `SELECT * from ${tableName} ORDER BY name`
  return db.all(query).then(camelCaseAll)
}

exports.getUser = userId => {
  const query = `SELECT * from ${tableName} WHERE id = $1`
  const values = [userId]
  return db.get(query, values).then(camelCaseModel)
}

exports.setTunnelCount = (userId, count) => {
  const query = `UPDATE ${tableName} SET tunnelCount = $1 WHERE id = $2`
  const values = [count, userId]
  return db.run(query, values)
}
