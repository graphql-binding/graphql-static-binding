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
  Header: () => '',
}

function renderMainMethod(queryType: GraphQLObjectType, mutationType?: GraphQLObjectType | null, subscriptionType?: GraphQLObjectType | null) {
  return `exports.binding = {
  query: {
${renderMainMethodFields(queryType.getFields())}
  }${mutationType ? `,
  mutation: {
${renderMainMethodFields(mutationType.getFields())}
  }`: ''}${subscriptionType ? `,
  subscription: {
${renderMainMethodFields(subscriptionType.getFields())}
  }`: ''}
}`
}

function renderMainMethodFields(fields: GraphQLFieldMap<any, any>): string {
  return Object.keys(fields).map(f => {
    const field = fields[f]
    return `    ${field.name}(args, info) { 
      return /* TODO: Get actual implementation here from graphql-binding */
    }`
  }).join(',\n')
}
