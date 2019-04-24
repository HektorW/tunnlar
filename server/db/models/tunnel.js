const db = require('../index')
const createTable = require('./utils/createTable')
const { createModelCamelCaser } = require('./utils/camelCaseModel')
const user = require('./user')

const tableName = (exports.tableName = 'tunnel')

const tableColumnDefinitions = [
  'id SERIAL PRIMARY KEY',
  `by INTEGER REFERENCES ${user.tableName}`,
  `against INTEGER REFERENCES ${user.tableName}`,
  'tunnelItem TEXT',
  'date TIMESTAMP DEFAULT now()'
]

const { camelCaseAll } = createModelCamelCaser(
  tableColumnDefinitions
)

exports.setup = () => createTable(db, tableName, tableColumnDefinitions)

exports.getAllTunnels = () => {
  const query = `SELECT * from ${tableName} ORDER BY date`
  return db.all(query).then(camelCaseAll)
}

exports.addTunnel = (byId, againstId, tunnelItem = null) => {
  const columns = ['by', 'against', 'tunnelItem']
  const values = [byId, againstId, tunnelItem]

  return db.insert(tableName, columns, values)
}

exports.removeTunnel = tunnelId => {
  const query = `DELETE FROM ${tableName} WHERE id = $1`
  const values = [tunnelId]

  return db.run(query, values)
}
