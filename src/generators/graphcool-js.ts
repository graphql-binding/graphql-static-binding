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

export const generator: Generator = {
  Main: renderMainMethod,
  Header: renderHeader,
}

function renderHeader(schema: string): string {
  return `const { Graphcool } = require('graphcool-binding')
const { GraphQLResolveInfo } = require('graphql')

const typeDefs = \`
${schema}\``
}


function renderMainMethod(queryType: GraphQLObjectType, mutationType?: GraphQLObjectType | null, subscriptionType?: GraphQLObjectType | null) {
  return `module.exports.Graphcool = class Binding extends Graphcool {
  
  constructor({ endpoint, secret, fragmentReplacements, debug }) {
    super({ typeDefs, endpoint, secret, fragmentReplacements, debug });

    var self = this
    this.query = {
${renderMainMethodFields('query', queryType.getFields())}
    }${mutationType ? `
      
    this.mutation = {
${renderMainMethodFields('mutation', mutationType.getFields())}
    }`: ''}
  }
  
  delegate(operation, field, args, context, info) {
    return super.delegate(operation, field, args, context, info)
  }
}`
}

function renderMainMethodFields(operation: string, fields: GraphQLFieldMap<any, any>): string {
  return Object.keys(fields).map(f => {
    const field = fields[f]
    return `      ${field.name}(args, info) { 
        return self.delegate('${operation}', '${field.name}', args, {}, info)
      }`
  }).join(',\n')
}
