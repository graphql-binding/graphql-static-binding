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
  isWrappingType,
  GraphQLFieldMap,
  GraphQLEnumType,
  GraphQLType,
  GraphQLInterfaceType
} from 'graphql'

import { Generator } from '../types'

export const generator: Generator = {
  GraphQLUnionType: renderUnionType,
  GraphQLObjectType: renderObjectType,
  GraphQLInputObjectType: renderInputObjectType,
  GraphQLScalarType: renderScalarType,
  GraphQLEnumType: renderEnumType,
  GraphQLInterfaceType: renderObjectType,
  RootType: renderRootType,
  SubscriptionType: renderSubscriptionType,
  SchemaType: renderSchemaInterface,
  Main: renderMainMethod,
  Header: renderHeader
}

const scalarMapping = {
  Int: 'number',
  String: 'string',
  ID: 'string | number',
  Float: 'number',
  Boolean: 'boolean'
}

function renderHeader(schema: string): string {
  return `import { Graphcool as BaseGraphcool, BaseGraphcoolOptions } from 'graphcool-binding'
import { GraphQLResolveInfo } from 'graphql'

const typeDefs = \`
${schema}\``
}

function renderMainMethod(
  queryType: GraphQLObjectType,
  mutationType?: GraphQLObjectType | null,
  subscriptionType?: GraphQLObjectType | null
) {
  return `export class Graphcool extends BaseGraphcool {
  
  constructor({ endpoint, secret, fragmentReplacements, debug }: BaseGraphcoolOptions) {
    super({ typeDefs, endpoint, secret, fragmentReplacements, debug });
  }

  exists = {
${renderExistsFields(queryType.getFields())}
  }

  query: Query = {
${renderMainMethodFields('query', queryType.getFields())}
  }${
    mutationType
      ? `

  mutation: Mutation = {
${renderMainMethodFields('mutation', mutationType.getFields())}
  }`
      : ''
  }${
    subscriptionType
      ? `

  subscription: Subscription = {
${renderMainSubscriptionMethodFields(subscriptionType.getFields())}
  }`
      : ''
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
        return `    ${type.name}: (where: ${whereType}): Promise<boolean> => super.existsDelegate('query', '${field.name}', { where }, {}, '{ id }')`
      }
    })
    .filter(f => f)
    .join(',\n')
}

export function renderMainMethodFields(operation: string, fields: GraphQLFieldMap<any, any>): string {
  return Object.keys(fields)
    .map(f => {
      const field = fields[f]
      return `    ${field.name}: (args, info): Promise<${renderFieldType(field.type)}${
        !isNonNullType(field.type) ? ' | null' : ''
      }> => super.delegate('${operation}', '${field.name}', args, {}, info)`
    })
    .join(',\n')
}

export function renderMainSubscriptionMethodFields(fields: GraphQLFieldMap<any, any>): string {
  return Object.keys(fields)
    .map(f => {
      const field = fields[f]
      return `    ${field.name}: (args, infoOrQuery): Promise<AsyncIterator<${renderFieldType(field.type)}>> => super.delegateSubscription('${field.name}', args, infoOrQuery)`
    })
    .join(',\n')
}

function renderScalarType(type: GraphQLScalarType): string {
  if (type.name === 'ID') {
    return renderIDType(type)
  }
  return `${
    type.description
      ? `/*
${type.description}
*/
`
      : ''
  }export type ${type.name} = ${scalarMapping[type.name] || 'string'}`
}

function renderIDType(type: GraphQLScalarType): string {
  return `${
    type.description
      ? `/*
${type.description}
*/
`
      : ''
  }export type ${type.name}_Input = ${scalarMapping[type.name] || 'string'}
export type ${type.name}_Output = string`
}

function renderEnumType(type: GraphQLEnumType): string {
  return `${renderDescription(type.description)}export type ${type.name} = 
${type
    .getValues()
    .map(e => `  '${e.name}'`)
    .join(' |\n')}`
}

function renderRootType(type: GraphQLObjectType): string {
  const fieldDefinition = Object.keys(type.getFields())
    .map(f => {
      const field = type.getFields()[f]
      return `  ${field.name}: (args: {${field.args.length > 0 ? ' ' : ''}${field.args
        .map(f => `${renderFieldName(f)}: ${renderFieldType(f.type)}`)
        .join(', ')}${
        field.args.length > 0 ? ' ' : ''
      }}, info?: GraphQLResolveInfo | string) => Promise<${renderFieldType(field.type)}${
        !isNonNullType(field.type) ? ' | null' : ''
      }>`
    })
    .join('\n')

  return renderTypeWrapper(type.name, type.description, fieldDefinition)
}

function renderSubscriptionType(type: GraphQLObjectType): string {
  const fieldDefinition = Object.keys(type.getFields())
    .map(f => {
      const field = type.getFields()[f]
      return `  ${field.name}: (args: {${field.args.length > 0 ? ' ' : ''}${field.args
        .map(f => `${renderFieldName(f)}: ${renderFieldType(f.type)}`)
        .join(', ')}${
        field.args.length > 0 ? ' ' : ''
      }}, infoOrQuery?: GraphQLResolveInfo | string) => Promise<AsyncIterator<${renderFieldType(field.type)}>>`
    })
    .join('\n')

  return renderTypeWrapper(type.name, type.description, fieldDefinition)
}

function renderUnionType(type: GraphQLUnionType): string {
  return `${renderDescription(type.description)}export type ${type.name} = ${type
    .getTypes()
    .map(t => t.name)
    .join(' | ')}`
}

function renderObjectType(
  type: GraphQLObjectType | GraphQLInputObjectType | GraphQLInterfaceType
): string {
  const fieldDefinition = Object.keys(type.getFields())
    .map(f => {
      const field = type.getFields()[f]
      return `  ${renderFieldName(field)}: ${renderFieldType(field.type)}`
    })
    .join('\n')

  let interfaces: GraphQLInterfaceType[] = []
  if (type instanceof GraphQLObjectType) {
    interfaces = type.getInterfaces()
  }

  return renderInterfaceWrapper(type.name, type.description, interfaces, fieldDefinition)
}

function renderInputObjectType(
  type: GraphQLObjectType | GraphQLInputObjectType | GraphQLInterfaceType
): string {
  const fieldDefinition = Object.keys(type.getFields())
    .map(f => {
      const field = type.getFields()[f]
      return `  ${renderFieldName(field)}: ${renderInputFieldType(field.type)}`
    })
    .join('\n')

  let interfaces: GraphQLInterfaceType[] = []
  if (type instanceof GraphQLObjectType) {
    interfaces = type.getInterfaces()
  }

  return renderInterfaceWrapper(type.name, type.description, interfaces, fieldDefinition)
}

function renderFieldName(field: GraphQLInputField | GraphQLField<any, any>) {
  return `${field.name}${isNonNullType(field.type) ? '' : '?'}`
}

function renderFieldType(type: GraphQLInputType | GraphQLOutputType) {
  if (isNonNullType(type)) {
    return renderFieldType((type as GraphQLWrappingType).ofType)
  }
  if (isListType(type)) {
    return `${renderFieldType((type as GraphQLWrappingType).ofType)}[]`
  }
  return `${(type as GraphQLNamedType).name}${(type as GraphQLNamedType).name === 'ID' ? '_Output' : ''}`
}

function renderInputFieldType(type: GraphQLInputType | GraphQLOutputType) {
  if (isNonNullType(type)) {
    return renderInputFieldType((type as GraphQLWrappingType).ofType)
  }
  if (isListType(type)) {
    const inputType = renderInputFieldType((type as GraphQLWrappingType).ofType)
    return `${inputType}[] | ${inputType}`
  }
  return `${(type as GraphQLNamedType).name}${(type as GraphQLNamedType).name === 'ID' ? '_Input' : ''}`
}

function renderSchemaInterface(
  queryType: GraphQLObjectType,
  mutationType?: GraphQLObjectType | null,
  subscriptionType?: GraphQLObjectType | null
) {
  return `export interface Schema {
  query: ${queryType.name}
${
    mutationType
      ? `  mutation: ${mutationType.name}
`
      : ''
  }${
    subscriptionType
      ? `  subscription: ${subscriptionType.name}
`
      : ''
  }}`
}

function renderInterfaceWrapper(
  typeName: string,
  typeDescription: string,
  interfaces: GraphQLInterfaceType[],
  fieldDefinition: string
): string {
  return `${renderDescription(typeDescription)}export interface ${typeName}${
    interfaces.length > 0 ? ` extends ${interfaces.map(i => i.name).join(', ')}` : ''
  } {
${fieldDefinition}
}`
}

function renderTypeWrapper(typeName: string, typeDescription: string, fieldDefinition: string): string {
  return `${renderDescription(typeDescription)}export type ${typeName} = {
${fieldDefinition}
}`
}

function renderDescription(description?: string) {
  return `${
    description
      ? `/*
${description.split('\n').map(l => ` * ${l}\n`)}
 */
`
      : ''
  }`
}
