import initItem from './initItem'
import isArray from 'lodash/isArray'
import includes from 'lodash/includes'
import clone from 'lodash/clone'
import resolveParam from './resolveParam'

export default class Model {
  constructor({name, schema, resolvers, getSchema = f => f}) {
    this.name = name
    this.__isModel = true
    this.resolvedSchema = 'unresolved'
    this._schema = schema
    this.resolvedResolvers = 'unresolved'
    this._resolvers = resolvers

    this._getSchema = getSchema
  }

  initItem(data) {
    return initItem(this, data)
  }

  get resolvers() {
    if (this.resolvedResolvers !== 'unresolved') return this.resolvedResolvers
    this.resolvedResolvers = resolveParam(this._resolvers)
    return this.resolvedResolvers
  }

  set schema(schema) {
    this._schema = schema
    this.resolvedSchema = 'unresolved'
  }

  getSchema() {
    if (this.resolvedSchema !== 'unresolved') return this.resolvedSchema
    const schema = resolveParam(this._schema)

    this.resolvedSchema = this._getSchema(schema)
    return this.resolvedSchema
  }

  get schema() {
    const schema = this.getSchema()
    if (!schema) return
    const keys = Object.keys(schema)
    for (const key of keys) {
      if (isArray(schema[key].type)) {
        if (schema[key].type[0] instanceof Model) {
          schema[key].type[0] = schema[key].type[0].schema
        }
      }
      if (schema[key].type instanceof Model) {
        schema[key].type = schema[key].type.schema
      }
    }
    return {
      ...schema,
      __model: this
    }
  }

  get staticFields() {
    const schema = this.schema
    if (!schema) return []
    const keys = Object.keys(this.schema).filter(key => !key.startsWith('__'))

    return keys
      .map(key => {
        const field = schema[key]
        return {
          ...field,
          key
        }
      })
      .filter(field => !field.private)
  }

  get dynamicFields() {
    if (!this.resolvers) return []
    const keys = Object.keys(this.resolvers)

    return keys
      .map(key => {
        const resolver = this.resolvers[key]
        return {
          ...resolver,
          key
        }
      })
      .filter(resolver => !resolver.private)
  }

  clone({name = this.name, omitFields = [], mapFields = f => f}) {
    const getSchema = function(_schema) {
      const schema = {}

      const keys = Object.keys(_schema).filter(key => !includes(omitFields, key))
      for (const key of keys) {
        const field = clone(_schema[key])
        schema[key] = mapFields(field, key)
      }
      return schema
    }

    return new Model({
      name,
      schema: this._schema,
      getSchema,
      resolvers: this._resolvers
    })
  }
}