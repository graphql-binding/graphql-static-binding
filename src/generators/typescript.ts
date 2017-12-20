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
  GraphQLUnionType: renderUnionType,
  GraphQLObjectType: renderObjectType,
  GraphQLInputObjectType: renderObjectType,
  GraphQLScalarType: renderScalarType,
  GraphQLEnumType: renderEnumType,
  GraphQLInterfaceType: renderObjectType,
  RootType: renderRootType,
  SchemaType: renderSchemaInterface,
  Main: renderMainMethod,
}

const scalarMapping = {
  Int: 'number',
  String: 'string',
  ID: 'string | number',
  Float: 'number',
  Boolean: 'boolean'
}

function renderMainMethod(queryType: GraphQLObjectType, mutationType?: GraphQLObjectType | null, subscriptionType?: GraphQLObjectType | null) {
  return `export const binding: Schema = {
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
    return `    ${field.name}: (args, info): ${renderFieldType(field.type)}${!isNonNullType(field.type) ? ' | null' : ''} => { return /* TODO: Get actual implementation here from graphql-binding */ }`
  }).join(',\n')
}

function renderScalarType(type: GraphQLScalarType): string {
  return `${type.description ? `/*
${type.description}
*/
`: ''}export type ${type.name} = ${scalarMapping[type.name] || 'string'}`
}

function renderEnumType(type: GraphQLEnumType): string {
  return `${renderDescription(type.description)}export enum ${type.name} {
${type.getValues().map(e => `  ${e.name} = '${e.value}'`).join(',\n')}
}`
}
  
function renderRootType(type: GraphQLObjectType): string {
  const fieldDefinition = Object.keys(type.getFields()).map(f => {
    const field = type.getFields()[f]
    return `  ${field.name}: (args: {${field.args.length > 0 ? ' ': ''}${field.args.map(f => `${renderFieldName(f)}: ${renderFieldType(f.type)}`).join(', ')}${field.args.length > 0 ? ' ': ''}}, info: any) => ${renderFieldType(field.type)}${!isNonNullType(field.type) ? ' | null' : ''}`
  }).join('\n')

  return renderInterfaceWrapper(type.name, type.description, type.getInterfaces(), fieldDefinition)
}

function renderUnionType(type: GraphQLUnionType): string {
  return `${renderDescription(type.description)}export type ${type.name} = ${type.getTypes().map(t => t.name).join(' | ')}`
}
  
function renderObjectType(type: GraphQLObjectType | GraphQLInputObjectType | GraphQLInterfaceType): string {
  const fieldDefinition = Object.keys(type.getFields()).map(f => {
    const field = type.getFields()[f]
    return `  ${renderFieldName(field)}: ${renderFieldType(field.type)}`
  }).join('\n')

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
    return `Array<${renderFieldType((type as GraphQLWrappingType).ofType)}>`
  }
  return (type as GraphQLNamedType).name
}
  
function renderSchemaInterface(queryType: GraphQLObjectType, mutationType?: GraphQLObjectType | null, subscriptionType?: GraphQLObjectType | null) {
  return `export interface Schema {
  query: ${queryType.name}
${mutationType ? `  mutation: ${mutationType.name}
` : ''}${subscriptionType ? `  subscription: ${subscriptionType.name}
` : ''}}`
}
  
function renderInterfaceWrapper(typeName: string, typeDescription: string, interfaces: GraphQLInterfaceType[],fieldDefinition: string): string {
  return `${renderDescription(typeDescription)}export interface ${typeName}${interfaces.length > 0 ? ` extends ${interfaces.map(i => i.name).join(', ')}`: ''} {
${fieldDefinition}
}`
}

function renderDescription(description?: string) {
  return `${description ? `/*
${description}
*/
`: ''}`
}