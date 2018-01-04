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
import { generator as gcgenerator, renderMainMethodFields, renderMainSubscriptionMethodFields } from './graphcool-ts'

export const generator: Generator = {
  ...gcgenerator,
  Main: renderMainMethod,
  Header: renderHeader,
}

function renderHeader(schema: string): string {
  return `import { Binding as BaseBinding, BindingOptions } from 'graphql-binding'
import { GraphQLResolveInfo } from 'graphql'`
}

function renderMainMethod(queryType: GraphQLObjectType, mutationType?: GraphQLObjectType | null, subscriptionType?: GraphQLObjectType | null) {
  return `export class Binding extends BaseBinding {
  
  constructor({ schema, fragmentReplacements }: BindingOptions) {
    super({ schema, fragmentReplacements });
  }
  
  query: Query = {
${renderMainMethodFields('query', queryType.getFields())}
  }${mutationType ? `

  mutation: Mutation = {
${renderMainMethodFields('mutation', mutationType.getFields())}
  }`: ''}${subscriptionType ? `

  subscription: Subscription = {
${renderMainSubscriptionMethodFields(subscriptionType.getFields())}
  }`: ''}
}`
}