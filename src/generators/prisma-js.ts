import { GraphQLFieldMap, GraphQLInputObjectType, GraphQLObjectType, isListType, isWrappingType } from 'graphql';

import { Generator } from '../types';
import { renderMainMethodFields, renderMainSubscriptionMethodFields } from './graphcool-js';

export const generator: Generator = {
  Main: renderMainMethod,
  Header: renderHeader,
}

function renderHeader(schema: string): string {
  return `const { Prisma } = require('prisma-binding')
const { GraphQLResolveInfo } = require('graphql')

const typeDefs = \`
${schema}\``
}


function renderMainMethod(queryType: GraphQLObjectType, mutationType?: GraphQLObjectType | null, subscriptionType?: GraphQLObjectType | null) {
  return `module.exports.Prisma = class Binding extends Prisma {
  
  constructor({ endpoint, secret, fragmentReplacements, debug }) {
    super({ typeDefs, endpoint, secret, fragmentReplacements, debug });

    var self = this
    this.exists = {
${renderExistsFields(queryType.getFields())}
    }

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

export function renderExistsFields(fields: GraphQLFieldMap<any, any>) : string {
  return Object.keys(fields)
    .map(f => {
      const field = fields[f]
      let type = field.type
      let foundList = false
      // Traverse the wrapping types (if any)
      while (isWrappingType(type)) {
        type = type.ofType
        // One of those wrappings need to be a GraphQLList for this field to qualify
        foundList = foundList || isListType(type)
      }
      if (foundList) {
        const whereType = (field.args.find(a => a.name === 'where')!.type as GraphQLInputObjectType).name
        return `      ${type.name}(where) {
        return super.existsDelegate('query', '${field.name}', { where }, {}, '{ id }')
      }`
      }
    })
    .filter(f => f)
    .join(',\n')
}
