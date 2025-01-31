import isPlainObject from 'lodash/isPlainObject'
import isArray from 'lodash/isArray'
import {GraphQLList, GraphQLObjectType} from 'graphql'
import {getFieldType} from '@orion-js/schema'
import getScalar from './getScalar'
import getTypeAsResolver from './getTypeAsResolver'
import {getStaticFields} from '../../resolversSchemas/getStaticFields'
import {getDynamicFields} from '../../resolversSchemas/getDynamicFields'

export default function getGraphQLType(type, options) {
  if (!type) {
    throw new Error('Type is undefined')
  }

  if (isArray(type)) {
    const graphQLType = getGraphQLType(type[0], options)
    return new GraphQLList(graphQLType)
  } else if (!type._isFieldType && (isPlainObject(type) || type.__isModel)) {
    const model = type.__isModel ? type : type.__model
    if (!model || !model.__isModel) throw new Error('Type is not a Model')
    if (model.graphQLType) return model.graphQLType

    model.graphQLType = new GraphQLObjectType({
      name: model.name,
      fields: () => {
        const fields = {}
        for (const field of getStaticFields(model)) {
          try {
            /**
             * For fields that have custom "to client" resolvers and serverside are static
             */
            if (field.graphQLResolver) {
              fields[field.key] = getTypeAsResolver({
                resolver: field.graphQLResolver,
                getGraphQLType,
                options,
                model
              })
            } else {
              fields[field.key] = {
                type: getGraphQLType(field.type, options)
              }
            }
          } catch (error) {
            throw new Error(`Error getting type for ${field.key} ${error.message}`)
          }
        }

        for (const resolver of getDynamicFields(model)) {
          try {
            fields[resolver.key] = getTypeAsResolver({resolver, getGraphQLType, options, model})
          } catch (error) {
            throw new Error(
              `Error getting resolver type for resolver "${resolver.key}": ${error.message}`
            )
          }
        }
        return fields
      }
    })

    return model.graphQLType
  } else {
    const schemaType = getFieldType(type)
    const graphQLType = getScalar(schemaType)
    return graphQLType
  }
}
