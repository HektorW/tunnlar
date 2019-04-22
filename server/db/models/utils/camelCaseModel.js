function camelCaseModel(properties, model) {
  const modelKeys = Object.keys(model)
  const lowercaseProperties = properties.map(property => property.toLowerCase())

  return modelKeys.reduce((result, key) => {
    const propertyIndex = lowercaseProperties.indexOf(key)
    return propertyIndex === -1
      ? result
      : { ...result, [properties[propertyIndex]]: model[key] }
  }, {})
}

exports.createModelCamelCaser = tableColumnDefinitions => {
  const tableColumnProperties = tableColumnDefinitions.map(
    column => column.split(' ')[0]
  )

  const _camelCaseModel = model =>
    model ? camelCaseModel(tableColumnProperties, model) : model

  return {
    camelCaseModel: _camelCaseModel,
    camelCaseAll: models => models.map(_camelCaseModel)
  }
}
