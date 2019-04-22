const log = (...args) => console.log('utils/createTable', ...args)

module.exports = async function createTable(db, tableName, tableColumns) {
  let promiseChain = db.run(
    `CREATE TABLE IF NOT EXISTS ${tableName} (${tableColumns.join(', ')})`
  )

  tableColumns.forEach(columnDefinition => {
    const [columnName] = columnDefinition.split(' ')
    promiseChain = promiseChain.then(async () => {
      const query = `SELECT * FROM information_schema.columns WHERE table_name = $1 and column_name = $2`
      const values = [tableName, columnName.toLowerCase()]

      const row = await db.get(query, values)
      if (row) {
        // TODO : Check if type is correct
        return
      }

      log('Adding missing column in table', { tableName, columnDefinition })

      const alterQuery = `ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`
      return db.run(alterQuery)
    })
  })

  return promiseChain
}
