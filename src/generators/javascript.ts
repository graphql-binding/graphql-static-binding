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
  return `const { FragmentReplacements } = require('graphcool-binding/dist/src/extractFragmentReplacements');
const { GraphcoolLink } = require('graphcool-binding/dist/src/GraphcoolLink');
const { buildFragmentInfo, buildTypeLevelInfo } = require('graphcool-binding/dist/src/prepareInfo');
const { GraphQLResolveInfo, GraphQLSchema } = require('graphql');
const { GraphQLClient } = require('graphql-request');
const { SchemaCache } = require('graphql-schema-cache');
const { delegateToSchema } = require('graphql-tools');
const { sign } = require('jsonwebtoken');

// -------------------
// This should be in graphcool-binding
const schemaCache = new SchemaCache()

class BaseBinding {
  remoteSchema
  fragmentReplacements
  graphqlClient

  constructor({
    typeDefs,
    endpoint,
    secret,
    fragmentReplacements}) {
    
    fragmentReplacements = fragmentReplacements || {}

    const token = sign({}, secret)
    const link = new GraphcoolLink(endpoint, token)

    this.remoteSchema = schemaCache.makeExecutableSchema({
      link,
      typeDefs,
      key: endpoint,
    })

    this.fragmentReplacements = fragmentReplacements

    this.graphqlClient = new GraphQLClient(endpoint, {
      headers: { Authorization: \`Bearer \${token}\` },
    })
  }

  delegate(operation, prop, args, info) {
    if (!info) {
      info = buildTypeLevelInfo(prop, this.remoteSchema, operation)
    } else if (typeof info === 'string') {
      info = buildFragmentInfo(prop, this.remoteSchema, operation, info)
    }

    return delegateToSchema(
      this.remoteSchema,
      this.fragmentReplacements,
      operation,
      prop,
      args || {},
      {},
      info,
    )
  }

  async request(
    query,
    variables
  ) {
    return this.graphqlClient.request(query, variables)
  }
}
// -------------------

const typeDefs = \`
${schema}\``
}


function renderMainMethod(queryType: GraphQLObjectType, mutationType?: GraphQLObjectType | null, subscriptionType?: GraphQLObjectType | null) {
  return `export class Binding extends BaseBinding {
  
  constructor({ endpoint, secret, fragmentReplacements}) {
    super({ typeDefs, endpoint, secret, fragmentReplacements});
  }
  
  query = {
${renderMainMethodFields('query', queryType.getFields())}
  }${mutationType ? `

  mutation = {
${renderMainMethodFields('mutation', mutationType.getFields())}
  }`: ''}
}`
}

function renderMainMethodFields(operation: string, fields: GraphQLFieldMap<any, any>): string {
  return Object.keys(fields).map(f => {
    const field = fields[f]
    return `    ${field.name}(args, info) { 
      return super.delegate('${operation}', '${field.name}', args, info)
    }`
  }).join(',\n')
}
