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
  Header: renderHeader,
}

const scalarMapping = {
  Int: 'number',
  String: 'string',
  ID: 'string | number',
  Float: 'number',
  Boolean: 'boolean'
}

function renderHeader(schema: string): string {
  return `import { FragmentReplacements } from 'graphcool-binding/dist/src/extractFragmentReplacements';
import { GraphcoolLink } from 'graphcool-binding/dist/src/GraphcoolLink';
import { buildFragmentInfo, buildTypeLevelInfo } from 'graphcool-binding/dist/src/prepareInfo';
import { GraphQLResolveInfo, GraphQLSchema } from 'graphql';
import { GraphQLClient } from 'graphql-request';
import { SchemaCache } from 'graphql-schema-cache';
import { delegateToSchema } from 'graphql-tools';
import { sign } from 'jsonwebtoken';

// -------------------
// This should be in graphcool-binding
interface BindingOptions {
  fragmentReplacements?: FragmentReplacements
  endpoint: string
  secret: string
}

interface BaseBindingOptions extends BindingOptions {
  typeDefs: string
}

const schemaCache = new SchemaCache()

class BaseBinding {
  private remoteSchema: GraphQLSchema
  private fragmentReplacements: FragmentReplacements
  private graphqlClient: GraphQLClient

  constructor({
    typeDefs,
    endpoint,
    secret,
    fragmentReplacements} : BaseBindingOptions) {
    
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

  delegate<T>(operation: 'query' | 'mutation', prop: string, args, info?: GraphQLResolveInfo | string): Promise<T> {
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

  async request<T = any>(
    query: string,
    variables?: { [key: string]: any },
  ): Promise<T> {
    return this.graphqlClient.request<T>(query, variables)
  }
}
// -------------------

const typeDefs = \`
${schema}\``
}

function renderMainMethod(queryType: GraphQLObjectType, mutationType?: GraphQLObjectType | null, subscriptionType?: GraphQLObjectType | null) {
  return `export class Binding extends BaseBinding {
  
  constructor({ endpoint, secret, fragmentReplacements} : BindingOptions) {
    super({ typeDefs, endpoint, secret, fragmentReplacements});
  }
  
  query: Query = {
${renderMainMethodFields('query', queryType.getFields())}
  }${mutationType ? `

  mutation: Mutation = {
${renderMainMethodFields('mutation', mutationType.getFields())}
  }`: ''}
}`
}


function renderMainMethodFields(operation: string, fields: GraphQLFieldMap<any, any>): string {
  return Object.keys(fields).map(f => {
    const field = fields[f]
    return `    ${field.name}: (args, info): Promise<${renderFieldType(field.type)}${!isNonNullType(field.type) ? ' | null' : ''}> => super.delegate('${operation}', '${field.name}', args, info)`
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
    return `  ${field.name}: (args: {${field.args.length > 0 ? ' ': ''}${field.args.map(f => `${renderFieldName(f)}: ${renderFieldType(f.type)}`).join(', ')}${field.args.length > 0 ? ' ': ''}}, info?: GraphQLResolveInfo | string) => Promise<${renderFieldType(field.type)}${!isNonNullType(field.type) ? ' | null' : ''}>`
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