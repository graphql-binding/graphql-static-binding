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
import { generator as gcgenerator, renderFieldType, renderFieldName, renderTypeWrapper } from './graphcool-ts'

export const generator: Generator = {
  ...gcgenerator,
  Main: renderMainMethod,
  RootType: renderRootType,
  SubscriptionType: renderSubscriptionType,
  Header: renderHeader,
}

function renderSubscriptionType(type: GraphQLObjectType): string {
  const fieldDefinition = Object.keys(type.getFields())
    .map(f => {
      const field = type.getFields()[f]
      return `  ${field.name}: (args: {${field.args.length > 0 ? ' ' : ''}${field.args
        .map(f => `${renderFieldName(f)}: ${renderFieldType(f.type)}`)
        .join(', ')}${
        field.args.length > 0 ? ' ' : ''
      }}, context: { [key: string]: any }, infoOrQuery?: GraphQLResolveInfo | string) => Promise<AsyncIterator<${renderFieldType(field.type)}>>`
    })
    .join('\n')

  return renderTypeWrapper(type.name, type.description, fieldDefinition)
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

function renderRootType(type: GraphQLObjectType): string {
  const fieldDefinition = Object.keys(type.getFields())
    .map(f => {
      const field = type.getFields()[f]
      return `  ${field.name}: (args: {${field.args.length > 0 ? ' ' : ''}${field.args
        .map(f => `${renderFieldName(f)}: ${renderFieldType(f.type)}`)
        .join(', ')}${
        field.args.length > 0 ? ' ' : ''
      }}, context: { [key: string]: any }, info?: GraphQLResolveInfo | string) => Promise<${renderFieldType(field.type)}${
        !isNonNullType(field.type) ? ' | null' : ''
      }>`
    })
    .join('\n')

  return renderTypeWrapper(type.name, type.description, fieldDefinition)
}

export function renderMainMethodFields(operation: string, fields: GraphQLFieldMap<any, any>): string {
  return Object.keys(fields)
    .map(f => {
      const field = fields[f]
      return `    ${field.name}: (args, context, info): Promise<${renderFieldType(field.type)}${
        !isNonNullType(field.type) ? ' | null' : ''
      }> => super.delegate('${operation}', '${field.name}', args, context, info)`
    })
    .join(',\n')
}

export function renderMainSubscriptionMethodFields(fields: GraphQLFieldMap<any, any>): string {
  return Object.keys(fields)
    .map(f => {
      const field = fields[f]
      return `    ${field.name}: (args, context, infoOrQuery): Promise<AsyncIterator<${renderFieldType(field.type)}>> => super.delegateSubscription('${field.name}', args, context, infoOrQuery)`
    })
    .join(',\n')
}