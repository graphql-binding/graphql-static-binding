import { GraphQLObjectType } from 'graphql';

import { Generator } from '../types';
import {
    generator as gcgenerator,
    renderExistsFields,
    renderMainMethodFields,
    renderMainSubscriptionMethodFields,
} from './graphcool-ts';

export const generator: Generator = {
  ...gcgenerator,
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
  return `import { Prisma as BasePrisma, BasePrismaOptions } from 'prisma-binding'
import { GraphQLResolveInfo } from 'graphql'

export const typeDefs = \`
${schema}\``
}

function renderMainMethod(
  queryType: GraphQLObjectType,
  mutationType?: GraphQLObjectType | null,
  subscriptionType?: GraphQLObjectType | null
) {
  return `export class Prisma extends BasePrisma {
  
  constructor({ endpoint, secret, fragmentReplacements, debug }: BasePrismaOptions) {
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
