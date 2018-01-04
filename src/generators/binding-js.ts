import { 
    GraphQLUnionType,
    GraphQLWrappingType,
    GraphQLObjectType,
    GraphQLInputObjectType,
    GraphQLInputField,
    GraphQLField,
    GraphQLInputType,
    GraphQLOutputType,
    GraphQLScalarType,
    GraphQLNamedType,

    isNonNullType,
    isListType,
    GraphQLFieldMap,
    GraphQLEnumType,
    GraphQLType,
    GraphQLInterfaceType,
} from 'graphql'

import { Generator } from '../types'
import { renderMainMethodFields, renderMainSubscriptionMethodFields } from './graphcool-js'

export const generator: Generator = {
  Main: renderMainMethod,
  Header: renderHeader,
}

function renderHeader(schema: string): string {
  return `const { Binding: BaseBinding } = require('graphql-binding')
const { GraphQLResolveInfo } = require('graphql')`
}


function renderMainMethod(queryType: GraphQLObjectType, mutationType?: GraphQLObjectType | null, subscriptionType?: GraphQLObjectType | null) {
  return `module.exports.Binding = class Binding extends BaseBinding {
  
  constructor({ schema, fragmentReplacements }) {
    super({ schema, fragmentReplacements });

    var self = this
    this.query = {
${renderMainMethodFields('query', queryType.getFields())}
    }${mutationType ? `
      
    this.mutation = {
${renderMainMethodFields('mutation', mutationType.getFields())}
    }`: ''}${subscriptionType ? `
      
    this.subscription = {
${renderMainSubscriptionMethodFields('mutation', subscriptionType.getFields())}
    }`: ''}
  }
  
  delegate(operation, field, args, context, info) {
    return super.delegate(operation, field, args, context, info)
  }
}`
}

